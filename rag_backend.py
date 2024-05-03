import os
import logging
from flask import Flask, request, jsonify
from llama_index.llms.together import TogetherLLM
from llama_index.legacy.indices.managed.vectara import VectaraIndex, VectaraAutoRetriever
from llama_index.legacy.vector_stores.types import VectorStoreQuerySpec, MetadataFilter
from llama_index.core.vector_stores.types import VectorStoreInfo, MetadataInfo
from llama_index.legacy.schema import QueryBundle  # Importing QueryBundle

# Set up logging
logging.basicConfig(level=logging.INFO)

# Fetch API keys from environment variables
VECTARA_API_KEY = os.environ.get('VECTARA_API_KEY')
TOGETHER_API_KEY = os.environ.get('TOGETHER_API_KEY')

# Check if API keys are set
if not VECTARA_API_KEY or not TOGETHER_API_KEY:
    raise ValueError("API keys for Vectara and Together AI must be set as environment variables.")

# Initialize the Vectara Index and Retriever
vectara_index = VectaraIndex(api_key=VECTARA_API_KEY)

# Define VectorStoreInfo for Vectara
vectara_vector_store_info = VectorStoreInfo(
    content_info="Content related to user queries",
    metadata_info=[
        MetadataInfo(name="category", type="str", description="The category of the content"),
        MetadataInfo(name="date", type="str", description="The date of the content publication"),
    ],
)

vectara_retriever = VectaraAutoRetriever(vectara_index, vectara_vector_store_info)

# Initialize the Together LLM with the specified model
together_llm = TogetherLLM(model="mistralai/Mixtral-8x7B-Instruct-v0.1", api_key=TOGETHER_API_KEY)

app = Flask(__name__)

# Function to create chat completions using Together AI
@app.route('/create_chat_completions', methods=['POST'])
def create_chat_completions():
    """
    API endpoint to generate chat completions for a given prompt using Together AI.

    Returns:
        JSON response with the generated completion text.
    """
    prompt = request.json.get('prompt', '')
    if not prompt:
        return jsonify({"error": "Prompt is required"}), 400

    try:
        response = together_llm.complete(prompt=prompt)
        # Access the completion text correctly from the CompletionResponse object
        completion_text = response.choices[0].message.content
        return jsonify({"completion": completion_text})
    except Exception as e:
        logging.error(f"Error generating chat completion: {e}")
        return jsonify({"error": str(e)}), 500

# Function for Vectara search
@app.route('/vectara_search', methods=['GET'])
def vectara_search():
    """
    API endpoint to perform a search using Vectara and return the results.

    Returns:
        JSON response with a list of search results.
    """
    query = request.args.get('query', '')
    if not query:
        return jsonify({"error": "Query is required"}), 400

    try:
        query_bundle = QueryBundle(query_str=query)
        vectara_response = vectara_retriever.retrieve(query_bundle)
        # Extract the results from the vectara_response if it's a dictionary
        if isinstance(vectara_response, dict) and 'results' in vectara_response:
            results = vectara_response['results']
        else:
            results = vectara_response
        return jsonify({"results": results})
    except Exception as e:
        logging.error(f"Error performing Vectara search: {e}")
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 8080)))
