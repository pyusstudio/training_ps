import asyncio
import numpy as np
from typing import List, Dict, Optional, Tuple
import faiss
from fastembed import TextEmbedding
from loguru import logger
from ..models import SystemQuestion

class RagService:
    _instance = None
    _lock = asyncio.Lock()

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super(RagService, cls).__new__(cls)
            cls._instance.model = None
            cls._instance.index = None
            cls._instance.question_ids = []
            cls._instance._init_lock = asyncio.Lock()
        return cls._instance

    async def _ensure_model(self):
        async with self._init_lock:
            if self.model is None:
                logger.info("Initializing fastembed model...")
                # Lazy load the model
                self.model = TextEmbedding()
                logger.info("fastembed model initialized.")

    async def rebuild_index(self):
        await self._ensure_model()
        
        logger.info("Rebuilding FAISS index for questions...")
        questions = await SystemQuestion.find(SystemQuestion.is_active == 1).to_list()
        
        if not questions:
            logger.warning("No active questions found to index.")
            self.index = None
            self.question_ids = []
            self.question_map = {}
            return

        texts = [q.text for q in questions]
        q_ids = [q.id for q in questions]
        self.question_map = {q.id: q.text for q in questions}
    
        # Generate embeddings
        embeddings = list(self.model.embed(texts))
        embeddings_np = np.array(embeddings).astype('float32')
        
        # Build FAISS index
        dimension = embeddings_np.shape[1]
        new_index = faiss.IndexFlatL2(dimension)
        new_index.add(embeddings_np)
        
        # Atomic swap
        self.index = new_index
        self.question_ids = q_ids
        logger.info("FAISS index rebuilt | count={}", len(q_ids))

    async def search_questions(self, query: str, top_k: int = 2, threshold: float = 1.0) -> List[Tuple[str, str]]:
        """Search questions with a distance threshold (lower is better for L2)."""
        if self.index is None or not self.question_ids:
            # Try to build if empty
            await self.rebuild_index()
            if self.index is None:
                return []

        await self._ensure_model()
        
        # Embed query
        query_embedding = list(self.model.embed([query]))[0]
        query_np = np.array([query_embedding]).astype('float32')
        
        # Search
        distances, indices = self.index.search(query_np, min(top_k, len(self.question_ids)))
        
        results = []
        for dist, idx in zip(distances[0], indices[0]):
            if idx != -1 and dist < threshold:
                q_id = self.question_ids[idx]
                q_text = self.question_map.get(q_id)
                if q_text:
                    results.append((q_text, q_id))
                    logger.info("RAG Match Found | dist={:.4f} | q_id={}", dist, q_id)
        
        return results

rag_service = RagService()
