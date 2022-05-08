# Getting Started with Iot App Kit Bottling Line Demo

This project was bootstrapped with [Create React App](https://github.com/facebook/create-react-app).

## Pre-requisites

Install project dependencies by running:

### `npm ci`

Set your IAM credentials for programmatic access to query AWS IoT Sitewise APIs by adding a `.env` file in project root.
### `touch .env`

Add your IAM credentials for programmatic access as environment variables prefixed with REACT_APP_ as shown in the snippet in `.env`.
The value for `REACT_APP_AWS_SESSION_TOKEN` is only required if you are using short-lived IAM credentials for programmatic access.
```
REACT_APP_AWS_ACCESS_KEY_ID=<replace-with-aws-access-key-id>
REACT_APP_AWS_SECRET_ACCESS_KEY=<replace-with-aws-access-key>
REACT_APP_AWS_SESSION_TOKEN=<replace-with-aws-session-token>
```

## Available Scripts

In the project directory, you can run:

### `npm start`

Runs the app in the development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `npm test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `npm run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `npm run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).
