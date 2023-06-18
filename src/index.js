import puppeteer from 'puppeteer';
import { config } from 'dotenv';
import { createClient } from '@google/maps';
import chalk from 'chalk';

config();
const googleMapsClient = createClient({
    key: process.env.GMAP_API_KEY,
    Promise: Promise
});

async function checkWebsite(websiteUrl) {
    const browser = await puppeteer.launch({ headless: 'new' });
    const page = await browser.newPage();
    let isOnline;

    try {
        const response = await page.goto(websiteUrl);
        isOnline = response && response.ok();
    } catch (err) {
        isOnline = false;
    }

    await browser.close();
    return isOnline;
}


async function getPlaceDetails(placeId) {
    return googleMapsClient.place({
        placeid: placeId,
        fields: ['name', 'website', 'url'],
    }).asPromise()
        .then(async (response) => {
            const place = response.json.result;

            if (place.website || place.url) {
                const websiteUrl = place.website || place.url;
                if (websiteUrl.includes('maps.google.com')) {
                    console.log(chalk.red(`Website for ${place.name} is a Google Maps link`));
                } else if (websiteUrl.includes('instagram.com')) {
                    console.log(chalk.red(`Website for ${place.name} is an Instagram link`));
                } else if (websiteUrl.includes('facebook.com')) {
                    console.log(chalk.red(`Website for ${place.name} is a Facebook link`));
                } else {
                    const isOnline = await checkWebsite(websiteUrl);
                    if(isOnline) {
                        console.log(chalk.gray(`Website for ${place.name} is online`));
                        console.log(chalk.gray(websiteUrl));
                    } else {
                        console.log(chalk.red(`Website for ${place.name} is offline`));
                    }
                }
            } else {
                console.log(chalk.green(`No website information for ${place.name}`));
                console.log(chalk.green(JSON.stringify(place, null, 2)));
            }
        })
        .catch((err) => {
            console.log(err);
        });
}


async function getPlacesPage(query, pagetoken) {
    return googleMapsClient.places({
        query,
        language: 'fr',
        pagetoken,
    }).asPromise()
        .then(async (response) => {
            const restaurants = response.json.results;

            for (const restaurant of restaurants) {
                await getPlaceDetails(restaurant.place_id);
            }

            if (response.json.next_page_token) {
                await new Promise(resolve => setTimeout(resolve, 2000));
                await getPlacesPage(query, response.json.next_page_token);
            }
        })
        .catch((err) => {
            console.log(err);
        });
}

getPlacesPage('restaurant à Paris 2eme arrondissement');
