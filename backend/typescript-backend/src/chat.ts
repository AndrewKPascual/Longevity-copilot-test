import { Router, Request, Response } from 'express';
import { VectorStoreIndex, Document, MetadataMode, NodeWithScore, Settings, TogetherLLM, OpenAIEmbedding, ContextChatEngine } from 'llamaindex';
import fs from 'node:fs/promises';

// Define the message role type
enum MessageRole {
  USER = 'user',
  SYSTEM = 'system',
}

// Define the message interface
interface IMessage {
  role: MessageRole;
  content: string;
}

// Define the chat data interface
interface IChatData {
  messages: IMessage[];
}

// Create a new router to handle chat endpoints
const chatRouter = Router();

// Retrieve the TOGETHER_API_KEY from the environment variables
const togetherApiKey = process.env.TOGETHER_API_KEY;

// Set the TogetherLLM instance in the global Settings object
Settings.llm = new TogetherLLM({ apiKey: togetherApiKey });

// Set the OpenAIEmbedding instance in the global Settings object
Settings.embedModel = new OpenAIEmbedding({
  apiKey: togetherApiKey,
  model: "text-embedding-ada-002",
});

// Define the chat endpoint at the root of the chat router
chatRouter.post('/', async (req: Request, res: Response) => {
  try {
    // Extract the chat data from the request body
    const chatData: IChatData = req.body;

    // Validate the chat data
    if (chatData.messages.length === 0) {
      return res.status(400).json({ error: 'No messages provided' });
    }
    const lastMessage = chatData.messages[chatData.messages.length - 1];
    if (lastMessage.role !== MessageRole.USER) {
      return res.status(400).json({ error: 'Last message must be from user' });
    }

    // Load essay from a text file in the "data" directory
    const path = "data/sample-essay.txt"; // Updated path to the sample text file
    const essay = await fs.readFile(path, "utf-8");

    // Create Document object with essay
    const document = new Document({ text: essay, id_: path });

    // Split text and create embeddings. Store them in a VectorStoreIndex
    const index = await VectorStoreIndex.fromDocuments([document]);

    // Create a retriever from the index
    const retriever = index.asRetriever();

    // Set up the context prompt for the chat engine
    const contextPrompt = "Objective: You serve as the Longevity Assistant, tasked with enhancing users' longevity and healthspan by providing personalized advice. Your guidance should be concise, precise, informed by specific user information and reliable data sources.\n\n" +
      "Instructions:\n\n" +
      "Initial Data Analysis:\n" +
      "Begin by examining the information provided through - details such as age, health conditions, lifestyle preferences, and health goals.\n" +
      "Simultaneously, utilize the scientific data from Vectara’s 'longevity' corpus available to support your recommendations: {context_str} .\n\n" +
      "Response Formulation:\n" +
      "Combine insights from both data sources to tailor advice specifically suited to each user's needs. This should ensure recommendations are not only personalized but also deeply rooted in the latest research.\n\n" +
      "Tone and Professionalism:\n" +
      "Throughout the interaction, maintain a compassionate and professional tone. Strive to create an environment that reflects empathy and respect, ensuring all users feel valued and supported.\n\n" +
      "Privacy and Ethics:\n" +
      "Handle all personal data with the highest level of confidentiality. Use this information to guide your advice indirectly, ensuring no direct references to sensitive details are made in your responses.\n" +
      "Commit to ethical standards by promoting healthy, sustainable practices for longevity.\n\n" +
      "Output Specifications:\n" +
      "Keep responses concise, within a 200-word limit, to provide clear, actionable advice.\n" +
      "Include up to three specific recommendations that leverage both the personal and scientific data effectively.\n" +
      "Consistently check that the response tone is supportive and nurturing.\n" +
      "Format responses in plain text—avoid using markdown styles or emojis to uphold professionalism.\n\n" +
      "Example Use Case:\n" +
      "User Data: 'age: 52, health conditions: hypertension and diabetes, lifestyle preferences: vegetarian and enjoys walking, health goals: reduce blood pressure and manage blood sugar'\n\n" +
      "Expected Response:\n" +
      "'Considering your proactive health goals and the insights from our longevity studies, here are several strategies to consider:\n" +
      "Integrate a daily 30-minute walk to effectively manage blood pressure and blood sugar levels.\n" +
      "Follow a balanced diet rich in plant proteins and low-glycemic foods to support your vegetarian lifestyle and health conditions.\n" +
      "Regularly consult your healthcare provider to tailor and refine your health plan.\n" +
      "Keep up the great work—consistent efforts are key to achieving better health outcomes!'";

    // Initialize the chat engine with the retriever and context prompt
    const chatEngine = new ContextChatEngine({
      retriever,
      contextSystemPrompt: () => contextPrompt
    });

    // Query the chat engine and get the async iterable for the response
    const chatStreamPromise = chatEngine.chat({ message: lastMessage.content, stream: true });

    // Set the appropriate headers for streaming response
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    // Await the promise to get the async iterable and stream the response back to the client
    const chatStream = await chatStreamPromise;
    for await (const chunk of chatStream) {
      // Send each chunk of data as it is received
      res.write(`data: ${chunk.response}\n\n`);
    }

    // End the response stream
    res.end();
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
