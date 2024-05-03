import unittest
from unittest.mock import patch
from rag_backend import app
from llama_index.llms.together import TogetherLLM

# Mock classes for TogetherLLM.complete method response
class MockMessage:
    def __init__(self, content):
        self.content = content

class MockChoice:
    def __init__(self, message):
        self.message = message

class MockCompletionResponse:
    def __init__(self, choices):
        self.choices = choices

class TestRagBackend(unittest.TestCase):

    def setUp(self):
        self.app = app.test_client()
        self.app.testing = True

    @patch.object(TogetherLLM, 'complete')
    def test_create_chat_completions_valid(self, mock_complete):
        # Mock the response of the Together LLM complete method
        mock_complete.return_value = MockCompletionResponse(choices=[MockChoice(message=MockMessage(content="This is a test completion."))])
        response = self.app.post('/create_chat_completions', json={'prompt': 'Test prompt'})
        data = response.get_json()
        self.assertEqual(data['completion'], "This is a test completion.")

    @patch.object(TogetherLLM, 'complete')
    def test_create_chat_completions_error(self, mock_complete):
        # Mock an exception in the Together LLM complete method
        mock_complete.side_effect = Exception("API error")
        response = self.app.post('/create_chat_completions', json={'prompt': 'Test prompt'})
        self.assertEqual(response.status_code, 500)

    @patch('rag_backend.VectaraAutoRetriever.retrieve')
    def test_vectara_search_valid(self, mock_retrieve):
        # Mock the response of the VectaraAutoRetriever retrieve method
        mock_retrieve.return_value = {"results": ["Result 1", "Result 2"]}
        response = self.app.get('/vectara_search', query_string={'query': 'Test query'})
        data = response.get_json()
        self.assertEqual(data, {"results": ["Result 1", "Result 2"]})

    @patch('rag_backend.VectaraAutoRetriever.retrieve')
    def test_vectara_search_error(self, mock_retrieve):
        # Mock an exception in the VectaraAutoRetriever retrieve method
        mock_retrieve.side_effect = Exception("API error")
        response = self.app.get('/vectara_search', query_string={'query': 'Test query'})
        self.assertEqual(response.status_code, 500)

if __name__ == '__main__':
    unittest.main()
