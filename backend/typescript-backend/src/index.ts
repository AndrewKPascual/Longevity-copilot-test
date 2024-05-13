import { Router, Request } from 'express';
import { VectorStoreIndex, Document, MetadataMode } from 'llamaindex';
import fs from 'fs/promises';
import dotenv from 'dotenv';
dotenv.config();

const indexRouter = Router();

// Define the index endpoint at the root of the index router
indexRouter.get('/', async (req: Request, res) => {
    try {
        // Load documents from a text file in the "data" directory
        const path = "data/sample-essay.txt"; // Replace with the actual path to your text file
        const essay = await fs.readFile(path, "utf-8");

        // Create Document object with essay
        const document = new Document({ text: essay, id_: path });

        // Split text and create embeddings. Store them in a VectorStoreIndex
        const index = await VectorStoreIndex.fromDocuments([document]);

        // Query the index
        const queryEngine = index.asQueryEngine();
        const queryText = typeof req.query.query === 'string' ? req.query.query : '';
        const { response, sourceNodes } = await queryEngine.query({
            query: queryText,
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

export default indexRouter;
