# Marketplace Frontend

Decentraland's Marketplace

## Setup

0. Fill environment variables

```
$ mv .env.example .env
$ vi .env
```

1. Install dependencies

```
$ npm install
```

2. Run development server

```
$ npm start
```

3. Build for production

```
$ npm run build
```

## Generate TypeScript interfaces for contracts

If you want to regenerate the contract typings in `webapp/src/contracts` do the following:

```
npm run generate-contracts

MAP of the components for the project: 
1. Homepage.tsx -> renders the homepage overview
2. RankingsTable.container.ts -> responsible for rendering the ranking container
3. dev.json -> Links to the API are stored there
4. Navigation.tsx -> Second header links
5. index.html -> can change the tab name and the image for your application
  
```

