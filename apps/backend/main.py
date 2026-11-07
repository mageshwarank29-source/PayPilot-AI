
import os
from contextlib import asynccontextmanager
from decimal import Decimal

import jwt
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy import select, func
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware

from database import engine, Base, SessionLocal
from models import User, FinancialAccount, Transaction
from schemas import (
    UserRegister,
    UserLogin,
    UserResponse,
    TokenResponse,
    UserUpdate,
    UserPasswordChange,
    UserDelete,
    FinancialAccountCreate,
    FinancialAccountResponse,
    TransactionCreate,
    TransactionResponse,
    FinancialAssistantRequest,
    FinancialAssistantResponse
)
from auth import (
    hash_password,
    verify_password,
    create_access_token,
    decode_access_token
)


# DATABASE STARTUP

@asynccontextmanager
async def lifespan(app: FastAPI):
    Base.metadata.create_all(bind=engine)
    yield


# FASTAPI APPLICATION

app = FastAPI(
    title="PayPilot AI",
    description="AI-powered financial ecosystem",
    version="1.0.0",
    lifespan=lifespan
)


# CORS CONFIGURATION

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        origin.strip()
        for origin in os.getenv(
            "FRONTEND_URL",
            "http://localhost:3000"
        ).split(",")
        if origin.strip()
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer(auto_error=False)


# DATABASE DEPENDENCY

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


# AUTHENTICATION

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"}
        )

    try:
        payload = decode_access_token(credentials.credentials)
        user_id = payload.get("sub")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except jwt.InvalidTokenError:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.scalar(
        select(User).where(User.id == user_id)
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# HOME AND HEALTH

@app.get("/")
def home():
    return {
        "success": True,
        "message": "Welcome to PayPilot AI API"
    }


@app.get("/health")
def health():
    return {"status": "healthy"}


# USER REGISTRATION

@app.post(
    "/auth/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED
)
def register(
    user_data: UserRegister,
    db: Session = Depends(get_db)
):
    email = str(user_data.email).lower()

    existing_user = db.scalar(
        select(User).where(User.email == email)
    )

    if existing_user:
        raise HTTPException(
            status_code=409,
            detail="Email is already registered"
        )

    new_user = User(
        full_name=user_data.full_name,
        email=email,
        hashed_password=hash_password(user_data.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# USER LOGIN

@app.post("/auth/login", response_model=TokenResponse)
def login(
    login_data: UserLogin,
    db: Session = Depends(get_db)
):
    email = str(login_data.email).lower()

    user = db.scalar(
        select(User).where(User.email == email)
    )

    if not user or not verify_password(
        login_data.password,
        user.hashed_password
    ):
        raise HTTPException(
            status_code=401,
            detail="Incorrect email or password"
        )

    token = create_access_token(user.id)

    return {
        "access_token": token,
        "token_type": "bearer"
    }


# GET CURRENT USER

@app.get("/auth/me", response_model=UserResponse)
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return current_user


# UPDATE PROFILE

@app.put("/users/me", response_model=UserResponse)
def update_my_profile(
    user_data: UserUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    current_user.full_name = user_data.full_name

    db.commit()
    db.refresh(current_user)

    return current_user


# CHANGE PASSWORD

@app.put("/users/change-password")
def change_password(
    password_data: UserPasswordChange,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(
        password_data.current_password,
        current_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Current password is incorrect"
        )

    if password_data.current_password == password_data.new_password:
        raise HTTPException(
            status_code=400,
            detail="New password must be different"
        )

    current_user.hashed_password = hash_password(
        password_data.new_password
    )

    db.commit()

    return {
        "success": True,
        "message": "Password changed successfully"
    }


# DELETE USER ACCOUNT

@app.delete("/users/me")
def delete_my_account(
    user_data: UserDelete,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not verify_password(
        user_data.password,
        current_user.hashed_password
    ):
        raise HTTPException(
            status_code=400,
            detail="Incorrect password"
        )

    db.delete(current_user)
    db.commit()

    return {
        "success": True,
        "message": "Account deleted successfully"
    }


# CREATE FINANCIAL ACCOUNT

@app.post(
    "/accounts/",
    response_model=FinancialAccountResponse,
    status_code=status.HTTP_201_CREATED
)
def create_financial_account(
    account_data: FinancialAccountCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    new_account = FinancialAccount(
        user_id=current_user.id,
        account_name=account_data.account_name,
        account_type=account_data.account_type,
        institution_name=account_data.institution_name,
        balance=account_data.balance,
        currency=account_data.currency.upper()
    )

    db.add(new_account)
    db.commit()
    db.refresh(new_account)

    return new_account


# GET FINANCIAL ACCOUNTS

@app.get(
    "/accounts/",
    response_model=list[FinancialAccountResponse]
)
def get_financial_accounts(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    accounts = db.scalars(
        select(FinancialAccount).where(
            FinancialAccount.user_id == current_user.id
        )
    ).all()

    return accounts


# CREATE TRANSACTION WITH BALANCE VALIDATION

@app.post(
    "/transactions/",
    response_model=TransactionResponse,
    status_code=status.HTTP_201_CREATED
)
def create_transaction(
    transaction_data: TransactionCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        account = db.scalar(
            select(FinancialAccount)
            .where(
                FinancialAccount.id == transaction_data.account_id,
                FinancialAccount.user_id == current_user.id
            )
            .with_for_update()
        )

        if not account:
            raise HTTPException(
                status_code=404,
                detail="Financial account not found"
            )

        if transaction_data.transaction_type not in ["income", "expense"]:
            raise HTTPException(
                status_code=400,
                detail="Transaction type must be income or expense"
            )

        amount = Decimal(str(transaction_data.amount))

        if transaction_data.transaction_type == "expense":

            if account.balance < amount:
                raise HTTPException(
                    status_code=400,
                    detail="Insufficient balance"
                )

            account.balance -= amount

        else:
            account.balance += amount

        new_transaction = Transaction(
            user_id=current_user.id,
            account_id=account.id,
            transaction_type=transaction_data.transaction_type,
            category=transaction_data.category,
            description=transaction_data.description,
            amount=amount
        )

        db.add(new_transaction)
        db.commit()
        db.refresh(new_transaction)

        return new_transaction

    except HTTPException:
        db.rollback()
        raise

    except Exception:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail="Unable to create transaction"
        )


# GET TRANSACTIONS

@app.get(
    "/transactions/",
    response_model=list[TransactionResponse]
)
def get_transactions(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.scalars(
        select(Transaction).where(
            Transaction.user_id == current_user.id
        ).order_by(Transaction.transaction_date.desc())
    ).all()

    return transactions


# DASHBOARD ANALYTICS

@app.get("/dashboard/analytics")
def get_dashboard_analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    total_balance = db.scalar(
        select(func.coalesce(func.sum(FinancialAccount.balance), 0)).where(
            FinancialAccount.user_id == current_user.id
        )
    )

    total_income = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "income"
        )
    )

    total_expenses = db.scalar(
        select(func.coalesce(func.sum(Transaction.amount), 0)).where(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "expense"
        )
    )

    recent_transactions = db.scalars(
        select(Transaction).where(
            Transaction.user_id == current_user.id
        ).order_by(
            Transaction.transaction_date.desc()
        ).limit(5)
    ).all()

    expense_categories = db.execute(
        select(
            Transaction.category,
            func.sum(Transaction.amount).label("total")
        ).where(
            Transaction.user_id == current_user.id,
            Transaction.transaction_type == "expense"
        ).group_by(
            Transaction.category
        )
    ).all()

    return {
        "total_balance": float(total_balance),
        "total_income": float(total_income),
        "total_expenses": float(total_expenses),
        "net_cash_flow": float(total_income - total_expenses),

        "recent_transactions": [
            {
                "id": item.id,
                "category": item.category,
                "type": item.transaction_type,
                "amount": float(item.amount),
                "description": item.description,
                "date": item.transaction_date
            }
            for item in recent_transactions
        ],

        "expense_categories": [
            {
                "category": category,
                "total": float(total)
            }
            for category, total in expense_categories
        ]
    }


# FINANCIAL RISK ANALYSIS

@app.get("/ai/risk-analysis")
def get_financial_risk_analysis(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.scalars(
        select(Transaction).where(
            Transaction.user_id == current_user.id
        )
    ).all()

    income = sum(
        float(t.amount)
        for t in transactions
        if t.transaction_type == "income"
    )

    expenses = sum(
        float(t.amount)
        for t in transactions
        if t.transaction_type == "expense"
    )

    risks = []

    if expenses > income:
        risks.append({
            "risk": "Expenses exceed income",
            "severity": "high",
            "message": "Your recorded expenses are higher than your recorded income."
        })

    for transaction in transactions:
        if (
            transaction.transaction_type == "expense"
            and float(transaction.amount) >= 5000
        ):
            risks.append({
                "risk": "Large individual expense",
                "severity": "medium",
                "message": (
                    f"An expense of {float(transaction.amount)} "
                    f"was recorded in {transaction.category}."
                )
            })

    category_totals = {}

    for transaction in transactions:
        if transaction.transaction_type == "expense":
            category_totals[transaction.category] = (
                category_totals.get(transaction.category, 0)
                + float(transaction.amount)
            )

    for category, total in category_totals.items():
        if expenses > 0 and total / expenses >= 0.7:
            risks.append({
                "risk": "High category concentration",
                "severity": "medium",
                "message": (
                    f"{category} accounts for a large share "
                    "of your recorded expenses."
                )
            })

    return {
        "total_income": income,
        "total_expenses": expenses,
        "risk_count": len(risks),
        "risks": risks
    }


# FINANCIAL ASSISTANT

@app.post(
    "/ai/financial-assistant",
    response_model=FinancialAssistantResponse
)
def financial_assistant(
    request: FinancialAssistantRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    transactions = db.scalars(
        select(Transaction).where(
            Transaction.user_id == current_user.id
        )
    ).all()

    income = sum(
        float(t.amount)
        for t in transactions
        if t.transaction_type == "income"
    )

    expenses = sum(
        float(t.amount)
        for t in transactions
        if t.transaction_type == "expense"
    )

    categories = {}

    for transaction in transactions:
        if transaction.transaction_type == "expense":
            categories[transaction.category] = (
                categories.get(transaction.category, 0)
                + float(transaction.amount)
            )

    question = request.question.lower()

    if "income" in question:
        answer = f"Your recorded total income is INR {income:.2f}."

    elif "category" in question or "biggest" in question:
        if categories:
            biggest = max(categories, key=categories.get)
            answer = (
                f"Your highest expense category is {biggest}, "
                f"with INR {categories[biggest]:.2f}."
            )
        else:
            answer = "You don't have any recorded expenses yet."

    elif "expense" in question or "spend" in question:
        answer = f"Your recorded total expenses are INR {expenses:.2f}."

    elif "balance" in question:
        balance = db.scalar(
            select(
                func.coalesce(func.sum(FinancialAccount.balance), 0)
            ).where(
                FinancialAccount.user_id == current_user.id
            )
        )
        answer = f"Your total account balance is INR {float(balance):.2f}."

    elif "saving" in question or "save" in question:
        savings = income - expenses
        answer = f"Your recorded net cash flow is INR {savings:.2f}."

    else:
        answer = (
            f"Your recorded income is INR {income:.2f} "
            f"and expenses are INR {expenses:.2f}. "
            f"Your net cash flow is INR {income - expenses:.2f}."
        )

    return {
        "answer": answer,
        "data": {
            "total_income": income,
            "total_expenses": expenses,
            "net_cash_flow": income - expenses,
            "expense_categories": categories
        }
    }
