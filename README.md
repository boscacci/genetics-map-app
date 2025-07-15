# Global Genetics Professionals

A secure, interactive map application displaying genetic professionals worldwide. The app features clustered markers, advanced filtering, geocoding search, and authentication via passphrase.

## 🔐 Security Features

- **No public data files**: The original `data.csv` is never exposed publicly
- **Build-time processing**: Data is processed during build and embedded securely
- **Authentication required**: App requires passphrase to access the map
- **HTTPS by default**: Deployed on GitHub Pages with automatic HTTPS

## 🚀 Quick Deployment

### Prerequisites
1. GitHub account
2. Git installed locally
3. Node.js and npm installed

### Steps

1. **Create a new GitHub repository**
   ```bash
   # Create a new repository on GitHub, then:
   git init
   git remote add origin https://github.com/YOUR_USERNAME/YOUR_REPO_NAME.git
   ```

2. **Add your data file**
   ```bash
   # Copy your data.csv to the root directory (outside the app folder)
   cp /path/to/your/data.csv ../data.csv
   ```

3. **Deploy to GitHub Pages**
   ```bash
   ./deploy-github-pages.sh
   ```

4. **Configure GitHub Pages**
   - Go to your repository Settings → Pages
   - Set source to "Deploy from a branch"
   - Select "gh-pages" branch and "/ (root)" folder
   - Save

## 🔧 Development

### Local Development
```bash
npm start
```
Visit http://localhost:3000?key=[YOUR_PASSPHRASE]

### Build
```bash
npm run build
```
This automatically processes the data.csv file and creates a secure build.

### Data Processing
The app includes a build-time script that:
- Reads `data.csv` from the parent directory
- Filters specialists with valid coordinates
- Generates a TypeScript module with the data
- Excludes the original CSV from the build

## 📁 File Structure

```
genetics-map-app/
├── src/
│   ├── specialistsData.ts    # Auto-generated (do not edit)
│   ├── App.tsx              # Main application
│   ├── MapComponent.tsx     # Interactive map
│   ├── FilterComponent.tsx  # Filter controls
│   └── ...
├── scripts/
│   └── process-data.js      # Data processing script
├── .gitignore              # Excludes data.csv and generated files
└── deploy-github-pages.sh  # Deployment script
```

## 🔐 Authentication

The app uses two authentication methods:
1. **URL Parameter**: `?key=[YOUR_PASSPHRASE]`
2. **PostMessage**: For iframe embedding from Squarespace

## 🌍 Features

- **Interactive Map**: Leaflet-based map with clustering
- **Advanced Filtering**: Filter by country, city, and language
- **Geocoding Search**: Search for locations worldwide
- **Responsive Design**: Works on desktop and mobile
- **Draggable Filters**: Move filter panel around the map

## 🛡️ Security Notes

- The original `data.csv` file is in `.gitignore` and never committed
- Generated data files are also excluded from version control
- All sensitive data is processed at build time and embedded securely
- The app requires authentication before displaying any data

## 📊 Data

The app currently displays **103 genetic professionals** with valid coordinates from around the world, including:
- United States
- United Kingdom
- Australia
- India
- South Africa
- And many more countries

## 🚀 Deployment URL

After deployment, your app will be available at:
`https://YOUR_USERNAME.github.io/YOUR_REPO_NAME`

## Creating the Squarespace Embed

1. Generate your map preview HTML with your secret passphrase:
   ```bash
   # Run from the genetics-map-app directory
   PASSPHRASE="your_secure_passphrase" envsubst < map-preview.template.html > map-preview.html
   ```

2. Use the generated `map-preview.html` in your Squarespace site

## Technologies Used

- React
- TypeScript
- Leaflet (map library)
- React-Leaflet (React components for Leaflet)
- Leaflet.MarkerCluster (for clustering markers) # Updated: Tue Jul 15 13:44:07 EDT 2025
# Test deployment with GitHub Secrets - Tue Jul 15 13:52:04 EDT 2025
