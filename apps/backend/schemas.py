from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserRegister(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(min_length=8, max_length=128)


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    full_name: str
    email: EmailStr


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserUpdate(BaseModel):
    full_name: str = Field(min_length=2, max_length=100)

class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str = Field(min_length=8, max_length=128)

class UserDelete(BaseModel):
    password: str

class FinancialAccountCreate(BaseModel):
    account_name: str = Field(min_length=2, max_length=100)
    account_type: str = Field(min_length=2, max_length=50)
    institution_name: str | None = Field(default=None, max_length=100)
    balance: float = Field(default=0, ge=0)
    currency: str = Field(default="INR", min_length=3, max_length=3)


class FinancialAccountResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_name: str
    account_type: str
    institution_name: str | None
    balance: float
    currency: str

class TransactionCreate(BaseModel):
    account_id: str
    transaction_type: str = Field(min_length=3, max_length=20)
    category: str = Field(min_length=2, max_length=100)
    description: str | None = Field(default=None, max_length=255)
    amount: float = Field(gt=0)


class TransactionResponse(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    account_id: str
    transaction_type: str
    category: str
    description: str | None
    amount: float
    transaction_date: datetime
    created_at: datetime


class FinancialAssistantRequest(BaseModel):
    question: str = Field(min_length=2, max_length=500)


class FinancialAssistantResponse(BaseModel):
    answer: str
    data: dict

