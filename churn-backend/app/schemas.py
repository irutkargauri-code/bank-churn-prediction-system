from typing import Literal
from pydantic import BaseModel, Field


class Customer(BaseModel):
    CreditScore: int = Field(619, ge=300, le=900)
    Geography: Literal["France", "Germany", "Spain"] = "France"
    Gender: Literal["Female", "Male"] = "Female"
    Age: int = Field(42, ge=18, le=100)
    Tenure: int = Field(2, ge=0, le=10)
    Balance: float = Field(0, ge=0)
    NumOfProducts: int = Field(1, ge=1, le=4)
    HasCrCard: int = Field(1, ge=0, le=1)
    IsActiveMember: int = Field(1, ge=0, le=1)
    EstimatedSalary: float = Field(100000, ge=0)


class SimulateRequest(BaseModel):
    customer: Customer
    actions: list[Literal["make_active", "add_product", "remove_extra_products"]]
