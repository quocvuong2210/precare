from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.core.database import Base, engine
from app.api.v1.auth import router as auth_router
from app.api.v1.records import router as records_router
from app.api.v1.ingest import router as ingest_router
from app.api.v1.analysis import router as analysis_router
from app.api.v1.report import router as report_router
from app.api.v1.admin import router as admin_router

# Initialize Database tables if not existing
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PreCare Backend Application Gateway",
    description="Hệ thống số hóa hồ sơ cận lâm sàng và theo dõi thai kỳ (FastAPI Monorepo Gateway)",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Router Registrations
app.include_router(auth_router, prefix="/api/v1")
app.include_router(records_router, prefix="/api/v1")
app.include_router(ingest_router, prefix="/api/v1")
app.include_router(analysis_router, prefix="/api/v1")
app.include_router(report_router, prefix="/api/v1")
app.include_router(admin_router, prefix="/api/v1")

@app.get("/")
def root_status():
    return {
        "system": "PreCare API Gateway",
        "status": "online",
        "docs_url": "/docs"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
