"""
EBI 循证投资 — FastAPI Main Entry Point
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import settings

app = FastAPI(
    title="EBI 循证投资",
    description="Distributed investment intelligence platform",
    version="0.1.0",
    docs_url="/docs",
    redoc_url="/redoc",
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routers — import inline to avoid circular import issues
from routers import market as _market
app.include_router(_market.router)

from routers import ai_experts as _ai
app.include_router(_ai.router)

from routers import factors as _factors
app.include_router(_factors.router)

from routers import auth as _auth
app.include_router(_auth.router)


@app.get("/")
async def root():
    return {
        "name": "EBI 循证投资",
        "version": "0.1.0",
        "description": "Distributed investment intelligence platform",
        "docs": "/docs",
    }


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(
        "main:app",
        host=settings.API_HOST,
        port=settings.API_PORT,
        reload=True,
    )
