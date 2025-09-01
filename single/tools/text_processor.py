# Text processing tool for agents
# This tool provides text analysis and processing capabilities

import re
from langchain.tools import Tool

def text_processor_function(text: str) -> str:
    """
    Analyze and process text to extract useful information.
    
    Args:
        text: The text to analyze
        
    Returns:
        String with detailed text analysis
    """
    try:
        if not text or not text.strip():
            return "Error: No text provided for analysis"
        
        # Basic statistics
        word_count = len(text.split())
        char_count = len(text)
        char_count_no_spaces = len(text.replace(' ', ''))
        line_count = len(text.split('\n'))
        
        # Sentence count (rough estimation)
        sentences = re.split(r'[.!?]+', text)
        sentence_count = len([s for s in sentences if s.strip()])
        
        # Average word length
        words = text.split()
        avg_word_length = sum(len(word.strip('.,!?;:')) for word in words) / len(words) if words else 0
        
        # Most common words (simple analysis)
        word_freq = {}
        for word in words:
            clean_word = word.lower().strip('.,!?;:')
            if clean_word and len(clean_word) > 2:  # Ignore very short words
                word_freq[clean_word] = word_freq.get(clean_word, 0) + 1
        
        # Get top 3 most common words
        top_words = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:3]
        
        # Build analysis report
        analysis = f"""Text Analysis Results:
        
Basic Statistics:
- Characters: {char_count} (including spaces), {char_count_no_spaces} (excluding spaces)
- Words: {word_count}
- Lines: {line_count}
- Sentences: {sentence_count}
- Average word length: {avg_word_length:.1f} characters

Text Characteristics:
- Reading level: {"Simple" if avg_word_length < 5 else "Moderate" if avg_word_length < 7 else "Complex"}
- Text density: {"Concise" if word_count/line_count < 10 else "Dense"}"""
        
        if top_words:
            analysis += f"\n\nMost frequent words: {', '.join([f'{word} ({count})' for word, count in top_words])}"
        
        return analysis
        
    except Exception as e:
        return f"Error analyzing text: {str(e)}"

def create_text_processor_tool() -> Tool:
    """
    Create a text processing tool that agents can use.
    
    Returns:
        LangChain Tool object for text analysis and processing
    """
    return Tool(
        name="TextProcessor",
        func=text_processor_function,
        description="""Use this tool to analyze and process text content.
        It provides detailed statistics including:
        - Character, word, line, and sentence counts
        - Average word length and reading complexity
        - Most frequently used words
        - Text density and structure analysis
        
        Input should be the text you want to analyze as a string.
        Useful for content analysis, document processing, and text quality assessment."""
    )