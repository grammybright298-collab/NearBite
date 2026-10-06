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
            12
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
