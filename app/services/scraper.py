import requests
from bs4 import BeautifulSoup
from typing import List

def scrape_url(url: str) -> str:
    headers = {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
    }
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove navigation, footer, scripts, styles
        for element in soup(["script", "style", "nav", "footer", "header", "aside"]):
            element.decompose()
            
        text = soup.get_text()
        
        # Super-clean formatting 
        lines = (line.strip() for line in text.splitlines())
        chunks = (phrase.strip() for line in lines for phrase in line.split("  "))
        text = '\n'.join(chunk for chunk in chunks if chunk)
        
        return text
    except Exception as e:
        raise Exception(f"Failed to scrape URL {url}: {str(e)}")

def split_text(text: str, chunk_size=1000, chunk_overlap=200) -> List[str]:
    try:
        from langchain.text_splitter import RecursiveCharacterTextSplitter
        splitter = RecursiveCharacterTextSplitter(chunk_size=chunk_size, chunk_overlap=chunk_overlap)
        return splitter.split_text(text)
    except ImportError:
        # Fallback if langchain isn't populated
        import re
        sentences = re.split(r'(?<=[.!?]) +', text)
        chunks = []
        current_chunk = ""
        for s in sentences:
            if len(current_chunk) + len(s) < chunk_size:
                current_chunk += (" " + s)
            else:
                chunks.append(current_chunk.strip())
                current_chunk = s
        if current_chunk:
            chunks.append(current_chunk.strip())
        return chunks
