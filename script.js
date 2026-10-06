/* =========================================================
   NEARBITE
   RESTAURANT FINDER
========================================================= */

let userLocation = null;
let restaurants = [];
let map = null;
let userMarker = null;
let restaurantMarkers = [];


/* =========================================================
   ELEMENTS
========================================================= */

const searchInput =
    document.getElementById("searchInput");

const searchButton =
    document.getElementById("searchButton");

const locationButton =
    document.getElementById("locationButton");

const emptyLocationButton =
    document.getElementById("emptyLocationButton");

const restaurantList =
    document.getElementById("restaurantList");

const sortRestaurants =
    document.getElementById("sortRestaurants");

const categoryButtons =
    document.querySelectorAll(".category");


/* =========================================================
   LOAD LEAFLET MAP
========================================================= */

function loadMapLibrary() {

    const css =
        document.createElement("link");

    css.rel = "stylesheet";

    css.href =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";

    document.head.appendChild(css);


    const script =
        document.createElement("script");

    script.src =
        "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";

    script.onload = function () {

        console.log(
            "NearBite map loaded."
        );

    };

    script.onerror = function () {

        console.error(
            "Could not load Leaflet."
        );

    };

    document.body.appendChild(script);
}


/* =========================================================
   INITIALIZE MAP
========================================================= */

function initializeMap(
    latitude,
    longitude
) {

    if (typeof L === "undefined") {

        setTimeout(function () {

            initializeMap(
                latitude,
                longitude
            );

        }, 500);

        return;
    }


    if (!map) {

        map = L.map("map").setView(
            [
                latitude,
                longitude
            ],
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
            [
                latitude,
                longitude
            ],
            14
        );

    }


    if (userMarker) {

        map.removeLayer(
            userMarker
        );

    }


    userMarker =
        L.marker([
            latitude,
            longitude
        ])
        .addTo(map)
        .bindPopup(
            "<strong>You are here</strong>"
        );


    clearRestaurantMarkers();

    displayRestaurantMarkers();
}


/* =========================================================
   CLEAR RESTAURANT MARKERS
========================================================= */

function clearRestaurantMarkers() {

    restaurantMarkers.forEach(
        function (marker) {

            if (map) {

                map.removeLayer(
                    marker
                );

            }

        }
    );


    restaurantMarkers = [];
}


/* =========================================================
   DISPLAY RESTAURANT MARKERS
========================================================= */

function displayRestaurantMarkers() {

    if (!map) {

        return;
    }


    restaurants.forEach(
        function (restaurant) {

            if (
                restaurant.latitude === null ||
                restaurant.longitude === null
            ) {

                return;
            }


            const marker =
                L.marker([
                    restaurant.latitude,
                    restaurant.longitude
                ])
                .addTo(map);


            marker.bindPopup(`
                <strong>
                    ${escapeHTML(
                        restaurant.name
                    )}
                </strong>

                <br>

                ${escapeHTML(
                    restaurant.cuisine
                )}

                <br>

                ${escapeHTML(
                    restaurant.distance
                )} km away
            `);


            restaurantMarkers.push(
                marker
            );

        }
    );
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
        "Finding your location..."
    );


    navigator.geolocation.getCurrentPosition(

        function (position) {

            console.log(
                "User location:",
                position.coords.latitude,
                position.coords.longitude
            );


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

            console.error(
                "Location error:",
                error
            );


            showMessage(
                "Location access was not allowed. Please allow location access and try again."
            );

        },


        {
            enableHighAccuracy: true,

            timeout: 20000,

            maximumAge: 300000

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
        "Searching for restaurants near you..."
    );


    const latitude =
        userLocation.latitude;

    const longitude =
        userLocation.longitude;


    /*
       Search within 10 kilometers.
    */

    const radius = 10000;


    /*
       Overpass query.

       We search for:
       - restaurants
       - fast food
       - cafes
       - food courts
    */

    const query = `
        [out:json][timeout:60];

        (
            node["amenity"="restaurant"]
                (around:${radius},${latitude},${longitude});

            way["amenity"="restaurant"]
                (around:${radius},${latitude},${longitude});

            relation["amenity"="restaurant"]
                (around:${radius},${latitude},${longitude});

            node["amenity"="fast_food"]
                (around:${radius},${latitude},${longitude});

            way["amenity"="fast_food"]
                (around:${radius},${latitude},${longitude});

            node["amenity"="cafe"]
                (around:${radius},${latitude},${longitude});

            way["amenity"="cafe"]
                (around:${radius},${latitude},${longitude});
        );

        out center tags;
    `;


    /*
       Multiple Overpass servers.

       If one server fails,
       NearBite tries the next one.
    */

    const endpoints = [

        "https://overpass-api.de/api/interpreter",

        "https://overpass.kumi.systems/api/interpreter",

        "https://overpass.private.coffee/api/interpreter"

    ];


    let data = null;


    for (
        let i = 0;
        i < endpoints.length;
        i++
    ) {

        const endpoint =
            endpoints[i];


        try {

            console.log(
                "Trying:",
                endpoint
            );


            const response =
                await fetch(
                    endpoint,
                    {
                        method: "POST",

                        headers: {
                            "Content-Type":
                                "application/x-www-form-urlencoded;charset=UTF-8"
                        },

                        body:
                            "data=" +
                            encodeURIComponent(
                                query
                            )
                    }
                );


            console.log(
                "Response status:",
                response.status
            );


            if (!response.ok) {

                throw new Error(
                    "HTTP " +
                    response.status
                );

            }


            const json =
                await response.json();


            if (
                json &&
                Array.isArray(
                    json.elements
                )
            ) {

                data = json;

                console.log(
                    "Restaurants received:",
                    json.elements.length
                );

                break;

            }

        } catch (error) {

            console.error(
                "Overpass server failed:",
                endpoint,
                error
            );

        }

    }


    /*
       If every Overpass server failed.
    */

    if (
        !data ||
        !Array.isArray(
            data.elements
        )
    ) {

        showMessage(
            "The restaurant service is temporarily unavailable. Please try again."
        );

        return;
    }


    /*
       Convert OpenStreetMap data
       into NearBite restaurants.
    */

    restaurants =
        processRestaurants(
            data.elements
        );


    console.log(
        "Processed restaurants:",
        restaurants
    );


    /*
       Sort by nearest first.
    */

    sortCurrentRestaurants();


    /*
       Display restaurants.
    */

    renderRestaurants();


    /*
       Update map.
    */

    initializeMap(
        latitude,
        longitude
    );


    /*
       No restaurants.
    */

    if (!restaurants.length) {

        showMessage(
            "No restaurants were found within 10 km of your location."
        );

    }
}


/* =========================================================
   PROCESS RESTAURANTS
========================================================= */

function processRestaurants(
    elements
) {

    const processed = [];


    elements.forEach(
        function (element) {

            const tags =
                element.tags || {};


            /*
               Skip
