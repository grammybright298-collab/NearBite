/* =========================================================
   NEARBITE
   Restaurant Finder
========================================================= */


/* =========================================================
   VARIABLES
========================================================= */

let userLocation = null;
let restaurants = [];
let map = null;
let userMarker = null;
let restaurantMarkers = [];

const searchInput = document.getElementById("searchInput");
const searchButton = document.getElementById("searchButton");
const locationButton = document.getElementById("locationButton");
const emptyLocationButton = document.getElementById("emptyLocationButton");
const restaurantList = document.getElementById("restaurantList");
const sortRestaurants = document.getElementById("sortRestaurants");
const categoryButtons = document.querySelectorAll(".category");


/* =========================================================
   LOAD MAP LIBRARY
========================================================= */

function loadMapLibrary() {

    const leafletCSS = document.createElement("link");

    leafletCSS.rel = "stylesheet";
    leafletCSS.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

    document.head.appendChild(leafletCSS);


    const leafletScript = document.createElement("script");

    leafletScript.src =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

    leafletScript.onload = function () {
        console.log("Map library loaded.");
    };

    document.body.appendChild(leafletScript);
}


/* =========================================================
   INITIALIZE MAP
========================================================= */

function initializeMap(latitude, longitude) {

    if (typeof L === "undefined") {

        setTimeout(function () {
            initializeMap(latitude, longitude);
        }, 300);

        return;
    }


    if (!map) {

        map = L.map("map").setView(
            [latitude, longitude],
            14
        );


        L.tileLayer(
            "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
            {
                attribution:
                    "&copy; OpenStreetMap contributors",

                maxZoom: 19
            }
        ).addTo(map);

    } else {

        map.setView(
            [latitude, longitude],
            14
        );

    }


    if (userMarker) {
        map.removeLayer(userMarker);
    }


    userMarker = L.marker(
        [latitude, longitude]
    )
        .addTo(map)
        .bindPopup(
            "<strong>You are here</strong>"
        );


    userMarker.openPopup();


    clearRestaurantMarkers();


    displayRestaurantMarkers();
}


/* =========================================================
   CLEAR RESTAURANT MARKERS
========================================================= */

function clearRestaurantMarkers() {

    restaurantMarkers.forEach(function (marker) {

        map.removeLayer(marker);

    });


    restaurantMarkers = [];
}


/* =========================================================
   DISPLAY RESTAURANT MARKERS
========================================================= */

function displayRestaurantMarkers() {

    if (!map) {
        return;
    }


    restaurants.forEach(function (restaurant) {

        if (
            !restaurant.latitude ||
            !restaurant.longitude
        ) {
            return;
        }


        const marker = L.marker([
            restaurant.latitude,
            restaurant.longitude
        ])
            .addTo(map);


        marker.bindPopup(`
            <strong>${escapeHTML(restaurant.name)}</strong>
            <br>
            ${escapeHTML(restaurant.cuisine)}
            <br>
            ${restaurant.distance} km away
        `);


        restaurantMarkers.push(marker);

    });

}


/* =========================================================
   GET USER LOCATION
========================================================= */

function getUserLocation() {

    if (!navigator.geolocation) {

        showMessage(
            "Your browser does not support location services."
        );

        return;
    }


    showLoading(
        "Finding restaurants near you..."
    );


    navigator.geolocation.getCurrentPosition(

        function (position) {

            userLocation = {

                latitude:
                    position.coords.latitude,

                longitude:
                    position.coords.longitude

            };


            initializeMap(
                userLocation.latitude,
                userLocation.longitude
            );


            findRestaurants();

        },


        function (error) {

            console.error(error);


            showMessage(
                "We couldn't access your location. Please allow location access and try again."
            );

        },

        {
            enableHighAccuracy: true,
            timeout: 15000,
            maximumAge: 0
        }

    );

}


/* =========================================================
   FIND RESTAURANTS
========================================================= */

async function findRestaurants() {

    if (!userLocation) {

        getUserLocation();

        return;
    }


    showLoading(
        "Searching for nearby restaurants..."
    );


    const latitude =
        userLocation.latitude;

    const longitude =
        userLocation.longitude;


    const radius = 5000;


    const query = `
        [out:json][timeout:25];

        (
            node["amenity"="restaurant"]
                (around:${radius},${latitude},${longitude});

            way["amenity"="restaurant"]
                (around:${radius},${latitude},${longitude});

            relation["amenity"="restaurant"]
                (around:${radius},${latitude},${longitude});
        );

        out center tags;
    `;


    const url =
        "https://overpass-api.de/api/interpreter";


    try {

        const response = await fetch(
            url,
            {
                method: "POST",

                body: query
            }
        );


        if (!response.ok) {

            throw new Error(
                "Restaurant service unavailable."
            );

        }


        const data =
            await response.json();


        restaurants =
            processRestaurants(
                data.elements
            );


        sortCurrentRestaurants();


        renderRestaurants();


        initializeMap(
            latitude,
            longitude
        );


    } catch (error) {

        console.error(error);


        showMessage(
            "We couldn't load nearby restaurants right now. Please try again."
        );

    }

}


/* =========================================================
   PROCESS RESTAURANT DATA
========================================================= */

function processRestaurants(elements) {

    const processed = [];


    elements.forEach(function (element) {

        const tags =
            element.tags || {};


        if (!tags.name) {
            return;
        }


        let latitude =
            element.lat;


        let longitude =
            element.lon;


        if (
            !latitude &&
            element.center
        ) {

            latitude =
                element.center.lat;

            longitude =
                element.center.lon;

        }


        if (
            !latitude ||
            !longitude
        ) {

            return;
        }


        const distance =
            calculateDistance(
                userLocation.latitude,
                userLocation.longitude,
                latitude,
                longitude
            );


        const cuisine =
            formatCuisine(
                tags.cuisine
            );


        const address =
            getAddress(tags);


        const phone =
            tags.phone ||
            tags["contact:phone"] ||
            "";


        const website =
            tags.website ||
            tags["contact:website"] ||
            "";


        const openingHours =
            tags.opening_hours ||
            "Opening hours unavailable";


        processed.push({

            id:
                element.id,

            name:
                tags.name,

            cuisine:
                cuisine,

            rawCuisine:
                (
                    tags.cuisine ||
                    ""
                ).toLowerCase(),

            latitude:
                latitude,

            longitude:
                longitude,

            distance:
                distance.toFixed(1),

            address:
                address,

            phone:
                phone,

            website:
                website,

            openingHours:
                openingHours,

            rating:
                tags.rating ||
                null

        });

    });


    processed.sort(function (a, b) {

        return (
            parseFloat(a.distance) -
            parseFloat(b.distance)
        );

    });


    return processed;

}


/* =========================================================
   CALCULATE DISTANCE
========================================================= */

function calculateDistance(
    latitude1,
    longitude1,
    latitude2,
    longitude2
) {

    const earthRadius = 6371;


    const latDifference =
        toRadians(
            latitude2 - latitude1
        );


    const lonDifference =
        toRadians(
            longitude2 - longitude1
        );


    const a =
        Math.sin(
            latDifference / 2
        ) *
        Math.sin(
            latDifference / 2
        ) +

        Math.cos(
            toRadians(latitude1)
        ) *

        Math.cos(
            toRadians(latitude2)
        ) *

        Math.sin(
            lonDifference / 2
        ) *
        Math.sin(
            lonDifference / 2
        );


    const c =
        2 *
        Math.atan2(
            Math.sqrt(a),
            Math.sqrt(1 - a)
        );


    return earthRadius * c;

}


/* =========================================================
   CONVERT DEGREES TO RADIANS
========================================================= */

function toRadians(degrees) {

    return degrees *
        (Math.PI / 180);

}


/* =========================================================
   FORMAT CUISINE
========================================================= */

function formatCuisine(cuisine) {

    if (!cuisine) {

        return "Restaurant";

    }


    return cuisine
        .split(";")
        .map(function (item) {

            return item
                .trim()
                .replace(/_/g, " ");

        })
        .join(", ");

}


/* =========================================================
   GET ADDRESS
========================================================= */

function getAddress(tags) {

    const street =
        tags["addr:street"] ||
        "";


    const houseNumber =
        tags["addr:housenumber"] ||
        "";


    const postcode =
        tags["addr:postcode"] ||
        "";


    const city =
        tags["addr:city"] ||
        tags["addr:town"] ||
        tags["addr:village"] ||
        "";


    const firstPart =
        [
            street,
            houseNumber
        ]
            .filter(Boolean)
            .join(" ");


    return [
        firstPart,
        postcode,
        city
    ]
        .filter(Boolean)
        .join(", ");

}


/* =========================================================
   DISPLAY RESTAURANTS
========================================================= */

function renderRestaurants() {

    if (!restaurants.length) {

        restaurantList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    🍽️
                </div>

                <h3>
                    No restaurants found
                </h3>

                <p>
                    Try another search or category.
                </p>

            </div>

        `;

        return;
    }


    restaurantList.innerHTML = "";


    restaurants.forEach(function (restaurant) {

        const card =
            document.createElement("article");


        card.className =
            "restaurant-card";


        const ratingText =
            restaurant.rating
                ? `⭐ ${restaurant.rating}`
                : "⭐ Rating unavailable";


        let websiteButton = "";


        if (restaurant.website) {

            websiteButton = `

                <a
                    href="${escapeAttribute(restaurant.website)}"
                    target="_blank"
                    rel="noopener noreferrer"
                >
                    Website
                </a>

            `;

        }


        let phoneHTML = "";


        if (restaurant.phone) {

            phoneHTML = `

                <p>
                    📞
                    ${escapeHTML(restaurant.phone)}
                </p>

            `;

        }


        const directionsURL =
            createDirectionsURL(
                restaurant.latitude,
                restaurant.longitude
            );


        card.innerHTML = `

            <h3>
                ${escapeHTML(restaurant.name)}
            </h3>

            <p>
                🍽️
                ${escapeHTML(restaurant.cuisine)}
            </p>

            <p>
                📍
                ${escapeHTML(restaurant.distance)}
                km away
            </p>

            <p class="restaurant-rating">
                ${ratingText}
            </p>

            <p>
                🕒
                ${escapeHTML(restaurant.openingHours)}
            </p>

            ${
                restaurant.address
                    ? `
                        <p>
                            🏠
                            ${escapeHTML(
                                restaurant.address
                            )}
                        </p>
                    `
                    : ""
            }

            ${phoneHTML}

            <div
                style="
                    display:flex;
                    gap:8px;
                    flex-wrap:wrap;
                    margin-top:12px;
                "
            >

                <a
                    href="${directionsURL}"
                    target="_blank"
                    rel="noopener noreferrer"
                    style="
                        padding:8px 12px;
                        background:#ff5a36;
                        color:white;
                        border-radius:6px;
                        text-decoration:none;
                        font-size:13px;
                        font-weight:bold;
                    "
                >
                    🧭 Directions
                </a>

                ${websiteButton}

            </div>

        `;


        card.addEventListener(
            "click",
            function (event) {

                if (
                    event.target.tagName === "A"
                ) {
                    return;
                }


                if (map) {

                    map.setView(
                        [
                            restaurant.latitude,
                            restaurant.longitude
                        ],
                        17
                    );

                }

            }
        );


        restaurantList.appendChild(card);

    });


    displayRestaurantMarkers();

}


/* =========================================================
   CREATE DIRECTIONS LINK
========================================================= */

function createDirectionsURL(
    latitude,
    longitude
) {

    return (
        "https://www.google.com/maps/dir/?api=1" +
        "&destination=" +
        latitude +
        "," +
        longitude
    );

}


/* =========================================================
   SEARCH RESTAURANTS
========================================================= */

function searchRestaurants() {

    const searchTerm =
        searchInput.value
            .trim()
            .toLowerCase();


    if (!searchTerm) {

        renderRestaurants();

        return;

    }


    const results =
        restaurants.filter(
            function (restaurant) {

                return (

                    restaurant.name
                        .toLowerCase()
                        .includes(searchTerm)

                    ||

                    restaurant.cuisine
                        .toLowerCase()
                        .includes(searchTerm)

                    ||

                    restaurant.rawCuisine
                        .includes(searchTerm)

                );

            }
        );


    renderFilteredRestaurants(
        results
    );

}


/* =========================================================
   CATEGORY FILTER
========================================================= */

function filterByCategory(category) {

    if (!restaurants.length) {

        getUserLocation();

        return;

    }


    const results =
        restaurants.filter(
            function (restaurant) {

                const cuisine =
                    restaurant.rawCuisine;


                const name =
                    restaurant.name
                        .toLowerCase();


                if (category === "pizza") {

                    return (
                        cuisine.includes("pizza") ||
                        name.includes("pizza")
                    );

                }


                if (category === "burgers") {

                    return (
                        cuisine.includes("burger") ||
                        name.includes("burger")
                    );

                }


                if (category === "chinese") {

                    return (
                        cuisine.includes("chinese")
                    );

                }


                if (category === "italian") {

                    return (
                        cuisine.includes("italian")
                    );

                }


                if (category === "sushi") {

                    return (
                        cuisine.includes("sushi") ||
                        cuisine.includes("japanese")
                    );

                }


                if (category === "chicken") {

                    return (
                        cuisine.includes("chicken") ||
                        name.includes("chicken")
                    );

                }


                if (category === "cafe") {

                    return (
                        cuisine.includes("cafe") ||
                        cuisine.includes("coffee") ||
                        name.includes("cafe")
                    );

                }


                if (category === "healthy") {

                    return (
                        cuisine.includes("salad") ||
                        cuisine.includes("vegan") ||
                        cuisine.includes("vegetarian") ||
                        cuisine.includes("healthy")
                    );

                }


                return true;

            }
        );


    renderFilteredRestaurants(
        results
    );

}


/* =========================================================
   RENDER FILTERED RESTAURANTS
========================================================= */

function renderFilteredRestaurants(
    results
) {

    if (!results.length) {

        restaurantList.innerHTML = `

            <div class="empty-state">

                <div class="empty-icon">
                    🔎
                </div>

                <h3>
                    No matching restaurants
                </h3>

                <p>
                    Try another search or category.
                </p>

            </div>

        `;

        return;

    }


    const originalRestaurants =
        restaurants;


    restaurants =
        results;


    renderRestaurants();


    restaurants =
        originalRestaurants;

}


/* =========================================================
   SORT RESTAURANTS
========================================================= */

function sortCurrentRestaurants() {

    const sortType =
        sortRestaurants.value;


    if (sortType === "distance") {

        restaurants.sort(
            function (a, b) {

                return (
                    parseFloat(a.distance) -
                    parseFloat(b.distance)
                );

            }
        );

    }


    if (sortType === "rating") {

        restaurants.sort(
            function (a, b) {

                const ratingA =
                    parseFloat(
                        a.rating || 0
                    );


                const ratingB =
                    parseFloat(
                        b.rating || 0
                    );


                return ratingB - ratingA;

            }
        );

    }


    if (sortType === "recommended") {

        restaurants.sort(
            function (a, b) {

                return (
                    parseFloat(a.distance) -
                    parseFloat(b.distance)
                );

            }
        );

    }

}


/* =========================================================
   SHOW LOADING MESSAGE
========================================================= */

function showLoading(message) {

    restaurantList.innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                ⏳
            </div>

            <h3>
                ${escapeHTML(message)}
            </h3>

            <p>
                Please wait a moment.
            </p>

        </div>

    `;

}


/* =========================================================
   SHOW ERROR / MESSAGE
========================================================= */

function showMessage(message) {

    restaurantList.innerHTML = `

        <div class="empty-state">

            <div class="empty-icon">
                ⚠️
            </div>

            <h3>
                Something went wrong
            </h3>

            <p>
                ${escapeHTML(message)}
            </p>

            <button
                id="retryLocationButton"
                style="
                    margin-top:10px;
                    border:none;
                    padding:12px 20px;
                    border-radius:8px;
                    background:#ff5a36;
                    color:white;
                    font-weight:700;
                    cursor:pointer;
                "
            >
                Try Again
            </button>

        </div>

    `;


    const retryButton =
        document.getElementById(
            "retryLocationButton"
        );


    if (retryButton) {

        retryButton.addEventListener(
            "click",
            getUserLocation
        );

    }

}


/* =========================================================
   ESCAPE HTML
========================================================= */

function escapeHTML(value) {

    const div =
        document.createElement("div");


    div.textContent =
        value || "";


    return div.innerHTML;

}


/* =========================================================
   ESCAPE ATTRIBUTE
========================================================= */

function escapeAttribute(value) {

    return String(value || "")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");

}


/* =========================================================
   EVENT LISTENERS
========================================================= */

locationButton.addEventListener(
    "click",
    getUserLocation
);


emptyLocationButton.addEventListener(
    "click",
    getUserLocation
);


searchButton.addEventListener(
    "click",
    searchRestaurants
);


searchInput.addEventListener(
    "keydown",
    function (event) {

        if (event.key === "Enter") {

            searchRestaurants();

        }

    }
);


sortRestaurants.addEventListener(
    "change",
    function () {

        sortCurrentRestaurants();

        renderRestaurants();

    }
);


categoryButtons.forEach(
    function (button) {

        button.addEventListener(
            "click",
            function () {

                const category =
                    button.dataset.category;


                filterByCategory(
                    category
                );

            }
        );

    }
);


/* =========================================================
   START NEARBITE
========================================================= */

loadMapLibrary();

console.log(
    "NearBite is ready."
);
