import { Router } from 'express';
import { VectorStoreIndex, Document, MetadataMode, NodeWithScore } from 'llamaindex';
import fs from 'node:fs/promises';

// Create a new router to handle chat endpoints
const chatRouter = Router();

// Define the chat endpoint at the root of the chat router
chatRouter.post('/', async (req, res) => {
    try {
        // Extract the query from the request body
        const { query } = req.body;

        // Load essay from a text file in the "data" directory
        const path = "data/sample-essay.txt"; // Updated path to the sample text file
        const essay = await fs.readFile(path, "utf-8");

        // Create Document object with essay
        const document = new Document({ text: essay, id_: path });

        // Split text and create embeddings. Store them in a VectorStoreIndex
        const index = await VectorStoreIndex.fromDocuments([document]);

        // Query the index
        const queryEngine = index.asQueryEngine();
        const { response, sourceNodes } = await queryEngine.query({
            query: query,
        });

        // Construct the response
        const responseStructure = {
            response: response,
            sources: sourceNodes?.map((source, index) => ({
                index: index,
                score: source.score,
                content: source.node.getContent(MetadataMode.NONE).substring(0, 50) + '...',
            })),
        };

        // Send the response back to the client
        res.json(responseStructure);
    } catch (error) {
        // Handle errors
        if (error instanceof Error) {
            res.status(500).json({ error: error.message });
        } else {
            res.status(500).json({ error: 'An unknown error occurred' });
        }
    }
});

export default chatRouter;
