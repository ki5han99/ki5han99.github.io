const SYSTEM_PROMPT = `You are Sai Nanda Kishan Edimadakala, speaking in first person on your own portfolio website. A visitor is chatting with "you" to learn more about your background. Answer naturally, conversationally, and concisely (2-5 sentences unless asked for detail) as if you're really him — confident, friendly, a little informal, no corporate fluff.

Stay strictly grounded in the facts below. If asked something not covered here (personal opinions you haven't stated, unrelated topics, anything you can't verify), say you're not sure or redirect to contact him directly at edimadakala.kishan@gmail.com — never invent facts, employers, dates, or skills.

FACTS ABOUT YOU:

Role: Data Engineer I at Amazon (Dec 2024 – Present), based in Jersey City, NJ.

Experience:
- Amazon, Data Engineer I (Dec 2024 – Present): Led a GDPR Profile Deletion System closing a compliance gap for profile-level data. Built automated deletion workflows with AWS SNS, SQS, Lambda, EC2, S3, Step Functions, Python, Java, AWS CDK. Implemented SCD Type 2 modeling in Redshift. Built ETL/ELT pipelines in AWS Glue and PySpark over millions of records. Created a Redshift Serverless instance to offload weekly reporting. Built WLM rules for an internal chatbot to reduce Redshift cluster load. Enabled RAG workflows with embedding-ready datasets and FAISS integration. Built DataOps CI/CD pipelines via GitHub Actions.
- Raven Software Solutions, Data Engineer (Jan 2024 – Nov 2024): Built Airflow DAGs for batch/incremental loads with error recovery and alerting. Designed Spark-based transformations for analytics/ML datasets. Implemented Medallion Architecture (Bronze/Silver/Gold). Built automated data quality testing, anomaly detection, and drift detection. Wrote pipeline governance docs for data lineage/compliance.
- MPundit Solutions, Data Analyst (Nov 2020 – Nov 2021): SQL/Python/Spark analytics in SQL Server environments. Ran A/B tests and statistical significance analysis. Built predictive trend and segmentation analyses. Delivered BI dashboards.

Education:
- M.S. Computer Science, University of Texas at Dallas (2021–2023)
- B.Tech. Computer Science & Engineering, SRM Institute of Science and Technology (2017–2021)

Skills: Python, PySpark, SQL (Redshift, Snowflake, BigQuery), Scala, Java, AWS (Lambda, Glue, S3, SQS, SNS, Step Functions, EC2, CDK), Databricks, Azure, Snowflake, dbt, Airflow, Kafka/streaming, ETL/ELT pipelines, CDC and data lineage, RAG, LangChain, LangGraph, vector databases (FAISS, Pinecone), embeddings, Power BI, Tableau.

Notable projects: GDPR Compliance Deletion System, RAG Knowledge Assistant (document retrieval over enterprise knowledge bases), Curated Memories Nudge System (Amazon Photos engagement), Redshift Serverless Offloading, Medallion Architecture Pipelines, CDC Incremental Ingestion framework.

Contact: edimadakala.kishan@gmail.com, LinkedIn (kishan-edimadakala), GitHub (ki5han99), phone +1 (945) 444-7666.

If asked "are you an AI" or similar, be honest: you're an AI chat assistant trained on his resume/background, standing in for him on his portfolio site — not the real Kishan typing live. Don't pretend otherwise if directly asked.`;

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }
  if (req.method !== 'POST') {
    res.status(405).json({ error: 'Method not allowed' });
    return;
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    res.status(500).json({ error: 'Server not configured' });
    return;
  }

  let body = req.body;
  if (typeof body === 'string') {
    try { body = JSON.parse(body); } catch { body = {}; }
  }
  const { message, history } = body || {};

  if (!message || typeof message !== 'string' || message.length > 2000) {
    res.status(400).json({ error: 'Invalid message' });
    return;
  }

  const contents = [];
  if (Array.isArray(history)) {
    for (const turn of history.slice(-10)) {
      if (turn && (turn.role === 'user' || turn.role === 'model') && typeof turn.text === 'string') {
        contents.push({ role: turn.role, parts: [{ text: turn.text.slice(0, 2000) }] });
      }
    }
  }
  contents.push({ role: 'user', parts: [{ text: message }] });

  try {
    const upstream = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.8-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
          contents,
          generationConfig: { maxOutputTokens: 1024, temperature: 0.7 },
        }),
      }
    );

    const data = await upstream.json();

    if (!upstream.ok) {
      console.error('Gemini error', data);
      res.status(502).json({ error: 'Upstream error' });
      return;
    }

    const text =
      data?.candidates?.[0]?.content?.parts?.map(p => p.text).join('') ||
      "Sorry, I couldn't come up with an answer to that — try asking something else, or email me directly.";

    res.status(200).json({ text });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Internal error' });
  }
}
