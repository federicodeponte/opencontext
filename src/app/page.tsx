export default function HomePage() {
  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>OpenContext API</h1>
      <p>Simple API for AI-powered company context analysis using Google Gemini</p>
      
      <h2>Usage</h2>
      <p><strong>POST</strong> <code>/api/analyze</code></p>
      
      <h3>Request Body:</h3>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
{`{
  "url": "https://example.com",
  "apiKey": "your-gemini-api-key" // optional if GEMINI_API_KEY env var is set
}`}
      </pre>
      
      <h3>Response:</h3>
      <pre style={{ background: '#f5f5f5', padding: '10px', borderRadius: '4px' }}>
{`{
  "company_name": "Company Name",
  "company_url": "https://example.com",
  "industry": "Technology",
  "description": "Company description...",
  "products": ["Product 1", "Product 2"],
  "target_audience": "Target audience description",
  "competitors": ["Competitor 1", "Competitor 2"],
  "tone": "Professional",
  "pain_points": ["Pain point 1", "Pain point 2"],
  "value_propositions": ["Value prop 1", "Value prop 2"],
  "use_cases": ["Use case 1", "Use case 2"],
  "content_themes": ["Theme 1", "Theme 2"]
}`}
      </pre>
      
      <h3>Environment Variables:</h3>
      <ul>
        <li><code>GEMINI_API_KEY</code> - Your Google Gemini API key</li>
      </ul>
      
      <p>
        <a href="https://github.com/federicodeponte/opencontext" target="_blank">
          View on GitHub
        </a>
      </p>
    </div>
  );
}