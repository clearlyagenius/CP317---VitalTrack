# VitalTrack - User Manual

## Prerequisites

*   Node.js v18 or higher
*   npm (comes with Node.js)
*   A Google Gemini API key (free at https://aistudio.google.com/apikey)

## How to run the application

1.  **Get the code:**
    Download the zip directly from GitHub and open it in an editor/IDE, or navigate to the folder via the terminal. Optionally, you can clone the repo as well.

2.  **Install dependencies via terminal:**
    ```bash
    npm install
    ```

3.  **Configure environment variables:**
    **NOTE:** In order to use any AI analysis or chat features, an API key is required. We used the free Gemini API that you can get online in just a few seconds.

    The following link takes you to Google AI Studio: https://aistudio.google.com/api-keys. 
    
    After receiving your API key, set it in the local environment by creating a `.env` file in the root directory of the project and adding `GEMINI_API_KEY` as your key. (There is a `.env.example` file attached as well for reference).
    
    ```env
    # Inside your .env file
    GEMINI_API_KEY=your-api-key-here
    ```

4.  **Start the development server:**
    ```bash
    npm run dev
    ```
    The application will be available at http://localhost:3000. To walk-through the application from here, just open the local dev server link in your browser.

5.  **Report uploads:**
    For uploading reports, we attached a `sample_reports` folder to GitHub that contains 3 sample text reports. These can be dragged and dropped into the upload zone to test the application's AI analysis and trend charting.

## Test Credentials

To test the application, simply create an account (Sign-up) using the following credentials:

| Field | Value |
| :--- | :--- |
| **Name** | Test Test |
| **Email** | test@example.com |
| **Password** | abc12345 |

Since all testing is done locally, the credentials are flexible and you can choose to enter whatever you wish for the form fields to test how registration and validation works.
