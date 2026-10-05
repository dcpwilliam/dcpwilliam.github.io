"""存储层：按用户隔离的 JSON 文件库 + 数据结构规范化。"""
from . import schema
from .json_store import exists, list_users, load, remove, save, stats, update

__all__ = ["schema", "load", "save", "update", "exists", "remove", "list_users", "stats"]
