import os
import json
from typing import List, Dict, Any
from pydantic import BaseModel, Field
from google.genai import Client
from google.genai.types import GenerateContentConfig
from app.db.mongo import db
import networkx as nx

GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY")
client = Client(api_key=GOOGLE_API_KEY) if GOOGLE_API_KEY else None

class NodeItem(BaseModel):
    id: str = Field(description="Unique name or label of the entity (e.g., 'Apple', 'Tim Cook')")
    type: str = Field(description="Category of the entity (e.g., 'Company', 'Person', 'Location')")

class EdgeItem(BaseModel):
    source: str = Field(description="ID of the source entity node")
    target: str = Field(description="ID of the target entity node")
    relation: str = Field(description="The relationship link (e.g., 'CEO_of', 'located_in', 'part_of')")

class GraphExtraction(BaseModel):
    nodes: List[NodeItem]
    edges: List[EdgeItem]

def extract_graph_from_text(text: str) -> Dict[str, Any]:
    """Uses Gemini to extract a structured Knowledge Graph from text snippet."""
    if not client:
        return {"nodes": [], "edges": []}

    prompt = f"""
    Analyze the following text and extract a Knowledge Graph representing entities and their relations.
    Focus on creating a clean, connected graph structure.
    Text snippet:
    {text}
    """

    try:
        response = client.models.generate_content(
            model='gemini-1.5-flash',
            contents=prompt,
            config=GenerateContentConfig(
                response_mime_type="application/json",
                response_schema=GraphExtraction,
                temperature=0.1
            ),
        )
        # Verify and return structured dict
        return json.loads(response.text)
    except Exception as e:
        print(f"[GraphRAG] Extraction failed: {e}")
        return {"nodes": [], "edges": []}

def save_graph_to_session(session_id: str, nodes: List[Dict], edges: List[Dict]):
    """Appends nodes and edges to the session workspace graph inside MongoDB."""
    sessions_col = db["pdf_sessions"]
    
    # Use $push or $addToSet with list dicts to aggregate graph
    sessions_col.update_one(
        {"_id": session_id},
        {
            "$addToSet": {
                "graph.nodes": {"$each": nodes},
                "graph.edges": {"$each": edges}
            }
        },
        upsert=True
    )

def query_graph_relations(session_id: str, query_entities: List[str]) -> str:
    """Queries neighborhood subgraph for entities in query and builds context string."""
    sessions_col = db["pdf_sessions"]
    session = sessions_col.find_one({"_id": session_id}, {"graph": 1})
    if not session or "graph" not in session:
        return ""

    graph_data = session["graph"]
    nodes = graph_data.get("nodes", [])
    edges = graph_data.get("edges", [])

    if not nodes and not edges:
        return ""

    # Build NetworkX graph for traversal
    G = nx.MultiDiGraph()
    for n in nodes:
        G.add_node(n["id"], type=n.get("type", "Unknown"))
    for e in edges:
        G.add_edge(e["source"], e["target"], relation=e.get("relation", "connected_to"))

    facts = []
    # Find 1-hop neighborhood for query entities
    for entity in query_entities:
        # Case insensitive match search
        matched_node = None
        for node in G.nodes():
            if entity.lower() in node.lower():
                matched_node = node
                break

        if matched_node:
            # Outgoing edges
            for target in G.neighbors(matched_node):
                edge_data = G.get_edge_data(matched_node, target)
                for key in edge_data:
                    rel = edge_data[key].get("relation")
                    facts.append(f"- {matched_node} is {rel} of {target}")
            
            # Incoming edges (predecessors)
            for source in G.predecessors(matched_node):
                edge_data = G.get_edge_data(source, matched_node)
                for key in edge_data:
                    rel = edge_data[key].get("relation")
                    facts.append(f"- {source} is {rel} of {matched_node}")

    if facts:
        return "\nKnowledge Graph Facts:\n" + "\n".join(set(facts[:10]))
    return ""

def process_graph_async(session_id: str, chunks: List[str]):
    """Background task to extract graphs layer for each text chunk into MongoDB."""
    for chunk in chunks:
        res = extract_graph_from_text(chunk)
        nodes = res.get("nodes", [])
        edges = res.get("edges", [])
        if nodes or edges:
            save_graph_to_session(session_id, nodes, edges)
            print(f"[GraphRAG] Saved {len(nodes)} nodes and {len(edges)} edges for {session_id}")

