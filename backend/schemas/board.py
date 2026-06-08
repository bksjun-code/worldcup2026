from pydantic import BaseModel, field_validator
from datetime import datetime
from models import ReactionType


class PostCreate(BaseModel):
    title: str
    content: str

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v):
        if not v.strip():
            raise ValueError("제목을 입력해주세요")
        if len(v) > 200:
            raise ValueError("제목은 200자를 초과할 수 없습니다")
        return v

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v):
        if not v.strip():
            raise ValueError("내용을 입력해주세요")
        return v


class PostUpdate(BaseModel):
    title: str
    content: str

    @field_validator("title")
    @classmethod
    def title_not_blank(cls, v):
        if not v.strip():
            raise ValueError("제목을 입력해주세요")
        if len(v) > 200:
            raise ValueError("제목은 200자를 초과할 수 없습니다")
        return v

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v):
        if not v.strip():
            raise ValueError("내용을 입력해주세요")
        return v


class PostAuthor(BaseModel):
    id: int
    nickname: str
    national: str

    class Config:
        from_attributes = True


class PostListItem(BaseModel):
    id: int
    title: str
    author: PostAuthor
    comment_count: int
    like_count: int
    dislike_count: int
    view_count: int
    created_at: datetime


class PostDetail(BaseModel):
    id: int
    title: str
    content: str
    author: PostAuthor
    comment_count: int
    like_count: int
    dislike_count: int
    view_count: int
    my_reaction: ReactionType | None
    created_at: datetime


class CommentCreate(BaseModel):
    content: str

    @field_validator("content")
    @classmethod
    def content_not_blank(cls, v):
        if not v.strip():
            raise ValueError("댓글 내용을 입력해주세요")
        return v


class CommentResponse(BaseModel):
    id: int
    content: str
    author: PostAuthor
    created_at: datetime


class ReactionRequest(BaseModel):
    type: ReactionType


class ReactionSummary(BaseModel):
    like_count: int
    dislike_count: int
    my_reaction: ReactionType | None
