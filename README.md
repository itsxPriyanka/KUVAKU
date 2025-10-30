# Lead Scoring Backend System

An AI-powered lead scoring system that combines rule-based logic with AI reasoning to qualify sales leads based on product fit and buying intent.

## Features

- **Offer Management**: Store product/service details and ideal customer profiles
- **CSV Lead Upload**: Bulk import leads with validation
- **Hybrid Scoring**: Combines rule-based (50 pts) + AI-based (50 pts) scoring
- **Intent Classification**: Classifies leads as High/Medium/Low intent
- **Export Results**: Download scored leads as CSV
- **Summary Statistics**: View scoring analytics

## Tech Stack

- Node.js + Express
- OpenAI GPT-4 for AI classification
- In-memory storage (easily replaceable with database)
- CSV parsing with validation

## Setup

### Prerequisites
- Node.js 16+ installed
- OpenAI API key

### Installation

1. Clone and install dependencies:
```bash
npm install
```

2. Create `.env` file:
```bash
cp .env.example .env
```

3. Add your OpenAI API key to `.env`:
```
OPENAI_API_KEY=your_actual_api_key_here
PORT=3000
```

4. Start the server:
```bash
# Development mode with auto-reload
npm run dev

# Production mode
npm start
```

Server will run on `http://localhost:3000`

## API Documentation

### 1. Create Offer
**POST** `/api/offer`

Define your product/service details.

**Request Body:**
```json
{
  "name": "AI Outreach Automation",
  "value_props": [
    "24/7 automated outreach",
    "6x more meetings booked",
    "AI-powered personalization"
  ],
  "ideal_use_cases": [
    "B2B SaaS mid-market",
    "Sales teams 5-50 reps"
  ]
}
```

**Response:** `201 Created`
```json
{
  "message": "Offer created successfully",
  "data": {
    "name": "AI Outreach Automation",
    "value_props": [...],
    "ideal_use_cases": [...],
    "createdAt": "2025-10-29T10:00:00.000Z"
  }
}
```

### 2. Upload Leads
**POST** `/api/leads/upload`

Upload CSV file with lead data.

**Required CSV Columns:**
- `name` - Lead's full name
- `role` - Job title/position
- `company` - Company name
- `industry` - Industry/sector
- `location` - Geographic location
- `linkedin_bio` - LinkedIn bio (optional)

**Request:**
- Content-Type: `multipart/form-data`
- Field name: `file`
- File type: CSV

**Example using cURL:**
```bash
curl -X POST http://localhost:3000/api/leads/upload \
  -F "file=@leads.csv"
```

**Response:** `201 Created`
```json
{
  "message": "Leads uploaded successfully",
  "data": {
    "total_uploaded": 10,
    "total_errors": 0,
    "leads": [...]
  }
}
```

### 3. Score Leads
**POST** `/api/score`

Run the scoring pipeline on uploaded leads.

**Response:** `200 OK`
```json
{
  "message": "Leads scored successfully",
  "data": {
    "total_leads": 10,
    "high_intent": 3,
    "medium_intent": 5,
    "low_intent": 2,
    "average_score": 62
  }
}
```

### 4. Get Results
**GET** `/api/results`

Retrieve scored leads.

**Query Parameters:**
- `intent` (optional) - Filter by intent: `high`, `medium`, or `low`

**Response:** `200 OK`
```json
{
  "data": [
    {
      "name": "Ava Patel",
      "role": "Head of Growth",
      "company": "FlowMetrics",
      "industry": "B2B SaaS",
      "location": "San Francisco",
      "intent": "High",
      "score": 85,
      "reasoning": "Rule Score (40/50): Decision maker role (+20), Exact industry match with ICP (+20), Complete data (+10) AI Analysis (45/50): Strong fit based on growth role in target market segment.",
      "details": {
        "rule_score": 40,
        "ai_score": 45,
        "ai_intent": "High"
      }
    }
  ]
}
```

### 5. Export Results as CSV
**GET** `/api/results/export`

Download scored leads as CSV file.

**Response:** CSV file download

### 6. Get Summary Statistics
**GET** `/api/results/summary`

View scoring analytics.

**Response:** `200 OK`
```json
{
  "data": {
    "total_leads": 10,
    "intent_distribution": {
      "high": 3,
      "medium": 5,
      "low": 2
    },
    "score_statistics": {
      "average": 62,
      "highest": 90,
      "lowest": 25
    },
    "top_leads": [
      {
        "name": "Ava Patel",
        "company": "FlowMetrics",
        "score": 90,
        "intent": "High"
      }
    ]
  }
}
```

### Additional Endpoints

**GET** `/api/offer` - View current offer
**GET** `/api/leads` - View uploaded leads
**GET** `/health` - Health check

## Scoring Logic

### Rule-Based Scoring (Max 50 points)

1. **Role Scoring (0-20 points)**
   - Decision Maker (CEO, CTO, VP, Director, Head of, etc.): **20 points**
   - Influencer (Manager, Lead, Senior, etc.): **10 points**
   - Other roles: **0 points**

2. **Industry Match (0-20 points)**
   - Exact match with ideal use cases: **20 points**
   - Adjacent/related industry: **10 points**
   - No match: **0 points**

3. **Data Completeness (0-10 points)**
   - All fields filled: **10 points**
   - Missing fields: **0 points**

### AI-Based Scoring (Max 50 points)

Uses OpenAI to analyze:
- Role decision-making power
- Industry-product fit
- Background relevance to product benefits

**Intent Mapping:**
- High Intent: **50 points**
- Medium Intent: **30 points**
- Low Intent: **10 points**

### Final Intent Classification

Total Score = Rule Score + AI Score

- **High Intent**: Score ≥ 70
- **Medium Intent**: Score 40-69
- **Low Intent**: Score < 40

## Project Structure

```
lead-scoring-backend/
├── src/
│   ├── routes/
│   │   ├── offerRoutes.js      # Offer management endpoints
│   │   ├── leadRoutes.js       # Lead upload endpoints
│   │   └── scoringRoutes.js    # Scoring & results endpoints
│   ├── services/
│   │   ├── scoringService.js   # Core scoring logic
│   │   └── aiService.js        # AI integration (OpenAI)
│   ├── storage/
│   │   └── storage.js          # In-memory data storage
│   ├── validators/
│   │   └── validators.js       # Input validation
│   └── server.js               # Express app setup
├── sample_data/
│   └── leads.csv               # Sample CSV file
├── .env.example                # Environment template
├── package.json
└── README.md
```

## Testing the API

### Using cURL

1. **Create an offer:**
```bash
curl -X POST http://localhost:3000/api/offer \
  -H "Content-Type: application/json" \
  -d '{
    "name": "AI Outreach Automation",
    "value_props": ["24/7 outreach", "6x more meetings"],
    "ideal_use_cases": ["B2B SaaS mid-market"]
  }'
```

2. **Upload leads:**
```bash
curl -X POST http://localhost:3000/api/leads/upload \
  -F "file=@sample_data/leads.csv"
```

3. **Score leads:**
```bash
curl -X POST http://localhost:3000/api/score
```

4. **Get results:**
```bash
curl http://localhost:3000/api/results
```

### Using Postman

1. Import the API endpoints into Postman
2. Set base URL to `http://localhost:3000`
3. Follow the endpoint documentation above

## Error Handling

The API returns consistent error responses:

```json
{
  "error": {
    "message": "Description of the error",
    "details": ["Additional error information"]
  }
}
```

**Common HTTP Status Codes:**
- `200` - Success
- `201` - Created successfully
- `400` - Bad request (validation error)
- `404` - Resource not found
- `500` - Internal server error

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `PORT` | Server port (default: 3000) | No |
| `NODE_ENV` | Environment (development/production) | No |
| `OPENAI_API_KEY` | OpenAI API key for AI scoring | Yes |

## Limitations & Future Enhancements

### Current Limitations
- In-memory storage (data lost on restart)
- Sequential AI calls (can be slow for many leads)
- Single offer at a time

### Potential Enhancements
- Database integration (PostgreSQL/MongoDB)
- Batch AI processing with rate limiting
- Multiple offers support
- Webhook notifications
- Lead deduplication
- Historical scoring tracking
- Advanced filtering and search
- Role-based access control

## Troubleshooting

### OpenAI API Errors
If AI scoring fails, the system falls back to rule-based scoring only.

**Common issues:**
- Invalid API key - Check `.env` file
- Rate limiting - Reduce concurrent requests
- Network issues - Check internet connection

### CSV Upload Issues
- Ensure CSV has all required columns
- Check for proper UTF-8 encoding
- Verify file size is under 5MB

## License

MIT

## Support

For issues or questions, please open an issue on the repository.
