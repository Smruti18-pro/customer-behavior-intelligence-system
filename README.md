# Customer360 | Customer Behavior Intelligence System

Customer360 is a unified Customer Behavior Intelligence Dashboard designed to combine and visualize customer shopping habits, loyalty data, and session behavior. 

## Overview

This project provides a comprehensive overview of customer interactions, consolidating data from various sources into a single, interactive dashboard. 

### Key Features

*   **Data Unification**: Merges data from `Customers.csv`, `Transactions.csv`, `Sessions.csv`, and `LoyaltyPoints.csv`.
*   **Interactive Filtering**: Allows users to filter customer data by Loyalty Tier, Channel, Gender, and State.
*   **Rich Visualizations**: Employs charts and graphs (using libraries like Chart.js, if configured) to display spending trends, demographic breakdowns, and engagement metrics.
*   **Detailed Data Table**: Presents a comprehensive view of merged customer data with sorting, searching, and pagination capabilities.

## Architecture

This is a static web application built using:

*   **HTML5**: For the structure of the dashboard (`index.html`).
*   **CSS3**: For styling, utilizing a modern color palette and typography (`styles.css`).
*   **JavaScript (Vanilla)**: For state management, data loading (via PapaParse for CSVs), data processing/merging, and rendering the interactive elements (`app.js`).

## Getting Started

Because this is a static site without a backend server, you can run it easily.

### Prerequisites
*   A modern web browser.
*   A local web server. (Due to browser security restrictions on loading local files via JavaScript/fetch, simply double-clicking `index.html` might not work if it needs to load the CSV files. You need to serve it over `http://` or `https://`).

### Running Locally

1.  **Using VS Code Live Server**: If you use Visual Studio Code, install the "Live Server" extension. Right-click `index.html` and select "Open with Live Server".
2.  **Using Python**: Open your terminal in the project directory and run:
    ```bash
    # Python 3
    python -m http.server 8000
    ```
    Then, open your browser and navigate to `http://localhost:8000`.
3.  **Using Node.js**: If you have Node.js installed, you can use `http-server`:
    ```bash
    npx http-server .
    ```
    Navigate to the provided localhost URL.

## Deployment

The dashboard can be deployed to any static web hosting service, such as:

*   **GitHub Pages**
*   **Vercel**
*   **Netlify**
*   **Traditional Web Hosting (cPanel)**

Simply upload all the files in this directory to your hosting provider's public folder.

## Data Structure Requirements

The application expects four CSV files to be located in the `files/` directory:

1.  `Customers.csv`: Contains core customer demographic data.
2.  `Transactions.csv`: Contains purchase history.
3.  `Sessions.csv`: Contains website interaction data.
4.  `LoyaltyPoints.csv`: Contains loyalty program tier and points data.
