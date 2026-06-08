from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, case
from typing import List

from database import get_db
from models import Post, Comment, Reaction, User, ReactionType
from schemas.board import (
    PostCreate, PostUpdate, PostListItem, PostDetail, PostAuthor,
    CommentCreate, CommentResponse,
    ReactionRequest, ReactionSummary,
)
from auth import get_current_user, get_current_user_optional

router = APIRouter(prefix="/api/board", tags=["board"])


def _reaction_counts(db: Session, post_id: int) -> dict:
    rows = (
        db.query(Reaction.type, func.count(Reaction.id).label("cnt"))
        .filter(Reaction.post_id == post_id)
        .group_by(Reaction.type)
        .all()
    )
    counts = {ReactionType.LIKE: 0, ReactionType.DISLIKE: 0}
    for r_type, cnt in rows:
        counts[r_type] = cnt
    return counts


def _my_reaction(db: Session, post_id: int, user: User | None) -> ReactionType | None:
    if not user:
        return None
    reaction = (
        db.query(Reaction)
        .filter(Reaction.post_id == post_id, Reaction.user_id == user.id)
        .first()
    )
    return reaction.type if reaction else None


@router.get("", response_model=List[PostListItem])
def list_posts(db: Session = Depends(get_db)):
    rows = (
        db.query(
            Post,
            func.count(func.distinct(Comment.id)).label("comment_count"),
            func.coalesce(func.sum(case((Reaction.type == ReactionType.LIKE, 1), else_=0)), 0).label("like_count"),
            func.coalesce(func.sum(case((Reaction.type == ReactionType.DISLIKE, 1), else_=0)), 0).label("dislike_count"),
        )
        .outerjoin(Comment, Comment.post_id == Post.id)
        .outerjoin(Reaction, Reaction.post_id == Post.id)
        .group_by(Post.id)
        .order_by(Post.created_at.desc())
        .all()
    )
    return [
        PostListItem(
            id=post.id,
            title=post.title,
            author=PostAuthor.model_validate(post.user),
            comment_count=comment_count,
            like_count=like_count,
            dislike_count=dislike_count,
            view_count=post.view_count,
            created_at=post.created_at,
        )
        for post, comment_count, like_count, dislike_count in rows
    ]


@router.post("", response_model=PostDetail, status_code=status.HTTP_201_CREATED)
def create_post(data: PostCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자는 응원글을 작성할 수 없습니다")
    post = Post(user_id=current_user.id, title=data.title, content=data.content)
    db.add(post)
    db.commit()
    db.refresh(post)
    return PostDetail(
        id=post.id, title=post.title, content=post.content,
        author=PostAuthor.model_validate(current_user),
        comment_count=0, like_count=0, dislike_count=0, view_count=post.view_count,
        my_reaction=None, created_at=post.created_at,
    )


@router.get("/{post_id}", response_model=PostDetail)
def get_post(post_id: int, db: Session = Depends(get_db), current_user: User | None = Depends(get_current_user_optional)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")

    post.view_count += 1
    db.commit()
    db.refresh(post)

    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post_id).scalar()
    counts = _reaction_counts(db, post_id)

    return PostDetail(
        id=post.id, title=post.title, content=post.content,
        author=PostAuthor.model_validate(post.user),
        comment_count=comment_count,
        like_count=counts[ReactionType.LIKE],
        dislike_count=counts[ReactionType.DISLIKE],
        view_count=post.view_count,
        my_reaction=_my_reaction(db, post_id, current_user),
        created_at=post.created_at,
    )


@router.put("/{post_id}", response_model=PostDetail)
def update_post(post_id: int, data: PostUpdate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="수정 권한이 없습니다")

    post.title = data.title
    post.content = data.content
    db.commit()
    db.refresh(post)

    comment_count = db.query(func.count(Comment.id)).filter(Comment.post_id == post_id).scalar()
    counts = _reaction_counts(db, post_id)
    return PostDetail(
        id=post.id, title=post.title, content=post.content,
        author=PostAuthor.model_validate(post.user),
        comment_count=comment_count,
        like_count=counts[ReactionType.LIKE],
        dislike_count=counts[ReactionType.DISLIKE],
        view_count=post.view_count,
        my_reaction=_my_reaction(db, post_id, current_user),
        created_at=post.created_at,
    )


@router.delete("/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_post(post_id: int, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")
    if post.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=403, detail="삭제 권한이 없습니다")
    db.delete(post)
    db.commit()


@router.get("/{post_id}/comments", response_model=List[CommentResponse])
def list_comments(post_id: int, db: Session = Depends(get_db)):
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")

    comments = (
        db.query(Comment)
        .filter(Comment.post_id == post_id)
        .order_by(Comment.created_at.asc())
        .all()
    )
    return [
        CommentResponse(
            id=c.id, content=c.content,
            author=PostAuthor.model_validate(c.user),
            created_at=c.created_at,
        )
        for c in comments
    ]


@router.post("/{post_id}/comments", response_model=CommentResponse, status_code=status.HTTP_201_CREATED)
def create_comment(post_id: int, data: CommentCreate, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    if current_user.is_admin:
        raise HTTPException(status_code=403, detail="관리자는 댓글을 작성할 수 없습니다")
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")

    comment = Comment(post_id=post_id, user_id=current_user.id, content=data.content)
    db.add(comment)
    db.commit()
    db.refresh(comment)
    return CommentResponse(
        id=comment.id, content=comment.content,
        author=PostAuthor.model_validate(current_user),
        created_at=comment.created_at,
    )


@router.put("/{post_id}/reaction", response_model=ReactionSummary)
def set_reaction(post_id: int, data: ReactionRequest, db: Session = Depends(get_db), current_user: User = Depends(get_current_user)):
    """좋아요/싫어요 토글: 같은 종류를 다시 누르면 취소, 다른 종류를 누르면 전환된다."""
    post = db.query(Post).filter(Post.id == post_id).first()
    if not post:
        raise HTTPException(status_code=404, detail="게시글을 찾을 수 없습니다")

    existing = (
        db.query(Reaction)
        .filter(Reaction.post_id == post_id, Reaction.user_id == current_user.id)
        .first()
    )

    if existing and existing.type == data.type:
        db.delete(existing)
    elif existing:
        existing.type = data.type
    else:
        db.add(Reaction(post_id=post_id, user_id=current_user.id, type=data.type))

    db.commit()

    counts = _reaction_counts(db, post_id)
    return ReactionSummary(
        like_count=counts[ReactionType.LIKE],
        dislike_count=counts[ReactionType.DISLIKE],
        my_reaction=_my_reaction(db, post_id, current_user),
    )
