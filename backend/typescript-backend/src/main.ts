import express from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import chatRouter from './chat'; // Import the chat router
import indexRouter from './index'; // Import the index router

// Load environment variables from .env file
dotenv.config();

// Create a new express application instance
const app = express();

// The port the express app will listen on
const port: string | number = process.env.PORT || 8000;

// Enable CORS for development environment
if (process.env.ENVIRONMENT === 'dev') {
    app.use(cors({
        origin: '*',
        methods: 'GET,HEAD,PUT,PATCH,POST,DELETE',
        preflightContinue: false,
        optionsSuccessStatus: 204
    }));
    console.log('CORS enabled for all origins in development mode');
}

// Use JSON parser for POST requests
app.use(express.json());

// Use the chat router for the '/chat' endpoint
app.use('/chat', chatRouter);

// Use the index router for the '/' endpoint
app.use('/', indexRouter);

// Start the express server
app.listen(port, () => {
    console.log(`Server running at http://localhost:${port}/`);
});
