# Privacy Notice: Family Weather Wardrobe

## What Data We Collect
- Location information (latitude/longitude or city name) to provide weather and clothing suggestions.
- Family member descriptions (as provided by user).
- Schedule or activity information (optional, as provided by user).

- Temperature unit preference (°C/°F) saved locally in your browser's `localStorage` when you select it.
	- We may also infer a preferred unit (°C or °F) from your provided location to present the most familiar units by default; this inference is performed on the client and can be overridden by you at any time.

## How We Use Your Data
- Data is used only to generate weather and clothing suggestions for your family.
- No personal data is stored or retained after the response is generated.
- We do not use your data for marketing, profiling, or sharing with third parties.

Notes on location and unit inference:
- If you allow browser geolocation, the app uses your device coordinates to fetch local weather. Coordinates may be transmitted to our backend and to third-party services (for example, weather providers or the AI service used to generate suggestions) in order to retrieve forecast data. We do not persist precise coordinates on our servers after processing the request.
- If you enter a location manually (city name, ZIP/postal code), that string is used to fetch weather and to infer region for default unit selection. The app may infer your country/region to auto-select Celsius or Fahrenheit for display; this is a usability feature only and is reversible via the UI toggle.

## Data Retention
- We do not persist or store personal data on our servers.
- Data is processed in-memory and discarded after the response.
- Logs do not contain personal data (names, locations, schedules).

## Third-Party Services
- Weather and clothing suggestions are generated using Google Gemini API.
- Location and family information may be sent to Google Gemini for processing.
- Google Gemini is operated by Google and subject to their privacy policies.

We may transmit location (coordinates or the location string you enter) and contextual information (family, schedule) to third-party services to fetch weather data and generate suggestions. These third parties are governed by their own privacy policies; we recommend reviewing them if you have concerns about sharing location data.

## Your Rights
- You may use the service without providing personal names or detailed schedules.

Local preferences and clearing data:
- Some preferences (family configuration, temperature unit preference, and whether the travel calendar is connected) are stored locally in your browser's `localStorage`. To remove these preferences, clear the site data in your browser or use the "Clear local preferences" option (if available in-app).
- If you prefer not to share location, choose to enter a location manually instead of allowing geolocation.

## Security
- All data is transmitted over HTTPS.

Operational notes:
- We aim to avoid logging personal data (names, precise coordinates, schedules). If logs include operational metadata, they are scrubbed of user-identifying details whenever possible.

## Cookies & Tracking
- We do not use cookies or tracking technologies.

## Changes
- This notice may be updated as the service evolves. Check back for updates.

---
For questions or requests, contact [contact@gaurav-desai.com].
