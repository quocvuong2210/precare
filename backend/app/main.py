from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.auth import router as auth_router
from app.core.database import Base, engine

from app.models.pregnancy_profile import PregnancyProfile
from app.api.pregnancy import router as pregnancy_router

from app.api.checkup import router as checkup_router
from app.api.deletion_request import router as deletion_request_router

  

# Initialize database tables
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="PreCare Backend Gateway",
    description="Hệ thống số hóa hồ sơ cận lâm sàng và theo dõi thai kỳ (FastAPI Monorepo Gateway)",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Authentication & RBAC Routes
app.include_router(auth_router, prefix="/api/v1/auth", tags=["Authentication & RBAC"])

# Pregnancy Profile Routes
app.include_router(pregnancy_router, prefix="/api/v1/pregnancy-profiles", tags=["Pregnancy Profile"])

# Checkup & Biometrics Routes
app.include_router(checkup_router, prefix="/api/v1/checkups", tags=["Checkups & Biometrics"])

# Deletion Request Routes
app.include_router(deletion_request_router, prefix="/api/v1/deletion-requests", tags=["Medical Deletion Requests"])

  


@app.get("/", tags=["System"])
def root_status():
    return {
        "system": "PreCare API Gateway",
        "status": "online",
        "docs_url": "/docs"
    }

@app.get("/health", tags=["System"])
def health_check():
    return {
        "status": "healthy"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8000, reload=True)