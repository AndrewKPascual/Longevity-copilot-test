import { Router, Request, Response } from 'express';
import { VectorStoreIndex, Document, Settings, TogetherLLM, storageContextFromDefaults } from 'llamaindex';
import fs, { readdirSync } from 'fs';
import dotenv from 'dotenv';
import path from 'path';
import logger from './logger'; // Logger utility for logging messages

dotenv.config();

const indexRouter = Router();

// Environment variables
const TOGETHER_API_KEY = process.env.TOGETHER_API_KEY || '';
const STORAGE_DIR = path.join(__dirname, '..', 'storage'); // directory to cache the generated index
const DATA_DIR = path.join(__dirname, '..', 'data'); // directory containing the documents to index

// Set the TogetherLLM instance in the global Settings object
Settings.llm = new TogetherLLM({ apiKey: TOGETHER_API_KEY });

// Define the index endpoint at the root of the index router
indexRouter.get('/', async (req: Request, res: Response) => {
    try {
        // Check if storage already exists
        if (!fs.existsSync(STORAGE_DIR)) {
            logger.info("Creating new index");
            // Load the documents and create the index
            const documents = await loadDocumentsFromDirectory(DATA_DIR);
            const storageContext = await storageContextFromDefaults({
                persistDir: STORAGE_DIR,
            });
            // Use the fromDocuments method to create the index from documents
            const index = await VectorStoreIndex.fromDocuments(documents, {
                storageContext,
            });
            logger.info(`Finished creating new index. Stored in ${STORAGE_DIR}`);
        } else {
            logger.info(`Loading index from ${STORAGE_DIR}...`);
            const storageContext = await storageContextFromDefaults({
                persistDir: STORAGE_DIR,
            });
            // Load the existing index
            logger.info(`Finished loading index from ${STORAGE_DIR}`);
        }

        // Respond with a simple message for now
        res.json({ message: 'Index route is functional' });
    } catch (error) {
        // Handle errors
        if (error instanceof Error) {
            logger.error(error.message);
            res.status(500).json({ error: error.message });
        } else {
            logger.error('An unknown error occurred');
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

export default indexRouter;

// Utility function to load documents from a directory
async function loadDocumentsFromDirectory(directory: string): Promise<Document[]> {
    const fileNames = readdirSync(directory);
    const documents = fileNames.map((fileName) => {
        const filePath = path.join(directory, fileName);
        const fileContent = fs.readFileSync(filePath, 'utf-8');
        return new Document({ text: fileContent, id_: filePath });
    });
    return documents;
}
