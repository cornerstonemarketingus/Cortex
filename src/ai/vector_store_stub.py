"""Minimal vector store stub for evidence retrieval. In production, replace with Milvus/FAISS/etc.
Provides add(item_id, vector, metadata) and search(query_vector, top_k).
"""
from typing import List, Dict, Tuple

_STORE = {}

def add(item_id: str, vector: List[float], metadata: Dict):
    _STORE[item_id] = {'vector': vector, 'metadata': metadata}

def search(query_vector: List[float], top_k: int = 5) -> List[Tuple[str, float]]:
    # naive L2 search
    res = []
    for k,v in _STORE.items():
        vec = v['vector']
        if len(vec) != len(query_vector): continue
        s = sum((a-b)**2 for a,b in zip(vec, query_vector))
        res.append((k, s))
    res.sort(key=lambda x:x[1])
    return res[:top_k]
