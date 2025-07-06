import numpy as np
from collections import defaultdict
from typing import List, Tuple, Callable
from aimakerspace.openai_utils.embedding import EmbeddingModel
import asyncio
import os
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import uuid


def cosine_similarity(vector_a: np.array, vector_b: np.array) -> float:
    """Computes the cosine similarity between two vectors."""
    dot_product = np.dot(vector_a, vector_b)
    norm_a = np.linalg.norm(vector_a)
    norm_b = np.linalg.norm(vector_b)
    return dot_product / (norm_a * norm_b)


class VectorDatabase:
    def __init__(self, embedding_model: EmbeddingModel = None):
        self.vectors = defaultdict(np.array)
        self.embedding_model = embedding_model or EmbeddingModel()

    def insert(self, key: str, vector: np.array) -> None:
        self.vectors[key] = vector

    def search(
        self,
        query_vector: np.array,
        k: int,
        distance_measure: Callable = cosine_similarity,
    ) -> List[Tuple[str, float]]:
        scores = [
            (key, distance_measure(query_vector, vector))
            for key, vector in self.vectors.items()
        ]
        return sorted(scores, key=lambda x: x[1], reverse=True)[:k]

    def search_by_text(
        self,
        query_text: str,
        k: int,
        distance_measure: Callable = cosine_similarity,
        return_as_text: bool = False,
    ) -> List[Tuple[str, float]]:
        query_vector = self.embedding_model.get_embedding(query_text)
        results = self.search(query_vector, k, distance_measure)
        return [result[0] for result in results] if return_as_text else results

    def retrieve_from_key(self, key: str) -> np.array:
        return self.vectors.get(key, None)

    async def abuild_from_list(self, list_of_text: List[str]) -> "VectorDatabase":
        embeddings = await self.embedding_model.async_get_embeddings(list_of_text)
        for text, embedding in zip(list_of_text, embeddings):
            self.insert(text, np.array(embedding))
        return self


class QdrantVectorDatabase:
    """Qdrant-based vector database for production use"""
    
    def __init__(self, collection_name: str = None, embedding_model: EmbeddingModel = None):
        self.embedding_model = embedding_model or EmbeddingModel()
        self.collection_name = collection_name or "documents"
        
        # Initialize Qdrant client
        qdrant_url = os.getenv("QDRANT_URL", "http://localhost:6333")
        qdrant_api_key = os.getenv("QDRANT_API_KEY")
        
        if qdrant_api_key:
            self.client = QdrantClient(url=qdrant_url, api_key=qdrant_api_key)
        else:
            self.client = QdrantClient(url=qdrant_url)
        
        # Ensure collection exists
        self._ensure_collection_exists()
    
    def _ensure_collection_exists(self):
        """Ensure the collection exists, create if it doesn't"""
        try:
            collections = self.client.get_collections()
            collection_names = [col.name for col in collections.collections]
            
            if self.collection_name not in collection_names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(
                        size=1536,  # OpenAI text-embedding-3-small dimension
                        distance=Distance.COSINE
                    )
                )
                print(f"✅ Created Qdrant collection: {self.collection_name}")
            else:
                print(f"✅ Using existing Qdrant collection: {self.collection_name}")
        except Exception as e:
            print(f"⚠️ Warning: Could not connect to Qdrant: {str(e)}")
            print("⚠️ Falling back to in-memory vector database")
            raise
    
    def insert(self, key: str, vector: np.array, metadata: dict = None) -> None:
        """Insert a vector with metadata into Qdrant"""
        try:
            point = PointStruct(
                id=str(uuid.uuid4()),
                vector=vector.tolist(),
                payload={
                    "text": key,
                    "metadata": metadata or {}
                }
            )
            self.client.upsert(
                collection_name=self.collection_name,
                points=[point]
            )
        except Exception as e:
            print(f"❌ Error inserting into Qdrant: {str(e)}")
            raise
    
    def search(
        self,
        query_vector: np.array,
        k: int,
        distance_measure: Callable = None,  # Not used for Qdrant
    ) -> List[Tuple[str, float]]:
        """Search for similar vectors in Qdrant"""
        try:
            results = self.client.search(
                collection_name=self.collection_name,
                query_vector=query_vector.tolist(),
                limit=k
            )
            
            return [(result.payload["text"], result.score) for result in results]
        except Exception as e:
            print(f"❌ Error searching Qdrant: {str(e)}")
            return []
    
    def search_by_text(
        self,
        query_text: str,
        k: int,
        distance_measure: Callable = None,  # Not used for Qdrant
        return_as_text: bool = False,
    ) -> List[Tuple[str, float]]:
        """Search by text query"""
        query_vector = self.embedding_model.get_embedding(query_text)
        results = self.search(query_vector, k, distance_measure)
        return [result[0] for result in results] if return_as_text else results
    
    def retrieve_from_key(self, key: str) -> np.array:
        """Retrieve vector by text key (not implemented for Qdrant)"""
        # This would require additional indexing in Qdrant
        # For now, return None as this method is not commonly used
        return None
    
    async def abuild_from_list(self, list_of_text: List[str], metadata: dict = None) -> "QdrantVectorDatabase":
        """Build Qdrant collection from list of texts"""
        try:
            embeddings = await self.embedding_model.async_get_embeddings(list_of_text)
            
            points = []
            for text, embedding in zip(list_of_text, embeddings):
                point = PointStruct(
                    id=str(uuid.uuid4()),
                    vector=embedding,
                    payload={
                        "text": text,
                        "metadata": metadata or {}
                    }
                )
                points.append(point)
            
            # Batch insert for better performance
            self.client.upsert(
                collection_name=self.collection_name,
                points=points
            )
            
            print(f"✅ Inserted {len(points)} documents into Qdrant collection: {self.collection_name}")
            return self
        except Exception as e:
            print(f"❌ Error building Qdrant collection: {str(e)}")
            raise
    
    def delete_collection(self):
        """Delete the collection (use with caution)"""
        try:
            self.client.delete_collection(collection_name=self.collection_name)
            print(f"✅ Deleted Qdrant collection: {self.collection_name}")
        except Exception as e:
            print(f"❌ Error deleting collection: {str(e)}")


if __name__ == "__main__":
    list_of_text = [
        "I like to eat broccoli and bananas.",
        "I ate a banana and spinach smoothie for breakfast.",
        "Chinchillas and kittens are cute.",
        "My sister adopted a kitten yesterday.",
        "Look at this cute hamster munching on a piece of broccoli.",
    ]

    vector_db = VectorDatabase()
    vector_db = asyncio.run(vector_db.abuild_from_list(list_of_text))
    k = 2

    searched_vector = vector_db.search_by_text("I think fruit is awesome!", k=k)
    print(f"Closest {k} vector(s):", searched_vector)

    retrieved_vector = vector_db.retrieve_from_key(
        "I like to eat broccoli and bananas."
    )
    print("Retrieved vector:", retrieved_vector)

    relevant_texts = vector_db.search_by_text(
        "I think fruit is awesome!", k=k, return_as_text=True
    )
    print(f"Closest {k} text(s):", relevant_texts)
