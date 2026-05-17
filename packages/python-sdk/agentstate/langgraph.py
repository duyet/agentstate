"""LangGraph checkpoint saver implementations backed by AgentState state storage."""

from __future__ import annotations

import asyncio
import base64
import json
import uuid
from typing import Any, Dict, Iterator, List, Optional, Sequence, Tuple

from agentstate.client import AgentStateClient

try:  # pragma: no cover - optional runtime dependency
    from langgraph.checkpoint.base import AsyncBaseCheckpointSaver as _AsyncBaseCheckpointSaver
    from langgraph.checkpoint.base import BaseCheckpointSaver as _BaseCheckpointSaver
except Exception:  # pragma: no cover - optional dependency missing

    class _BaseCheckpointSaver:  # noqa: D401
        """Fallback when langgraph-checkpoint is not installed."""

    class _AsyncBaseCheckpointSaver:  # noqa: D401
        """Fallback when langgraph-checkpoint is not installed."""


CHECKPOINT_KIND = "checkpoint"
WRITES_KIND = "checkpoint-writes"
RUNTIME = "langgraph"
CHECKPOINT_PREFIX_DEFAULT = "agentstate/langgraph"
AGENT_ID_DEFAULT = "agentstate-sdk"
ENCODING = "base64-json"
LIST_LIMIT_DEFAULT = 50
LIST_PAGE_SIZE = 100


def _normalize_namespace(value: Any) -> str:
    return value if isinstance(value, str) else ""


def _normalize_namespace_for_key(value: Any) -> str:
    return _normalize_namespace(value) or "default"


def _build_checkpoint_key(prefix: str, thread_id: str, checkpoint_ns: str, checkpoint_id: str) -> str:
    return f"{prefix}/{thread_id}/{_normalize_namespace_for_key(checkpoint_ns)}/{checkpoint_id}"


def _build_writes_key(
    prefix: str,
    thread_id: str,
    checkpoint_ns: str,
    checkpoint_id: str,
    task_id: str,
) -> str:
    return f"{prefix}/{thread_id}/{_normalize_namespace_for_key(checkpoint_ns)}/writes/{checkpoint_id}/{task_id}"


def _encode_envelope(value: Any) -> Dict[str, Any]:
    json_value = json.dumps(value, separators=(",", ":"))
    return {
        "encoding": ENCODING,
        "data": base64.b64encode(json_value.encode("utf-8")).decode("ascii"),
    }


def _decode_envelope(value: Any) -> Any:
    if not isinstance(value, dict):
        return None
    if value.get("encoding") != ENCODING:
        return value
    encoded = value.get("data")
    if not isinstance(encoded, str):
        return None
    return json.loads(base64.b64decode(encoded).decode("utf-8"))


def _safe_dict(value: Any) -> Dict[str, Any]:
    return value if isinstance(value, dict) else {}


def _safe_list(value: Any) -> List[Any]:
    return value if isinstance(value, list) else []


def _safe_sequence(value: Any) -> Sequence[Any]:
    return value if isinstance(value, list) or isinstance(value, tuple) else ()


def _get_thread_id(config: Dict[str, Any]) -> str:
    configurable = config.get("configurable", {})
    if not isinstance(configurable, dict):
        raise ValueError("LangGraph config requires configurable.thread_id")
    thread_id = configurable.get("thread_id")
    if not isinstance(thread_id, str) or not thread_id:
        raise ValueError("LangGraph config requires configurable.thread_id")
    return thread_id


def _get_checkpoint_ns(config: Dict[str, Any]) -> str:
    configurable = config.get("configurable", {})
    if not isinstance(configurable, dict):
        return ""
    return _normalize_namespace(configurable.get("checkpoint_ns"))


def _get_checkpoint_id(config: Dict[str, Any]) -> Optional[str]:
    configurable = config.get("configurable", {})
    if not isinstance(configurable, dict):
        return None
    checkpoint_id = configurable.get("checkpoint_id")
    if isinstance(checkpoint_id, str):
        return checkpoint_id
    if isinstance(checkpoint_id, int):
        return str(checkpoint_id)
    return None


def _extract_checkpoint_id(checkpoint: Dict[str, Any]) -> Optional[str]:
    checkpoint_id = checkpoint.get("id")
    return checkpoint_id if isinstance(checkpoint_id, str) else None


def _extract_versions(checkpoint: Any) -> Dict[str, Any]:
    result: Dict[str, Any] = {}
    raw = _safe_dict(checkpoint)
    if isinstance(raw.get("channel_versions"), dict):
        result.update(raw["channel_versions"])
    if isinstance(raw.get("versions"), dict):
        result.update(raw["versions"])
    return result


def _normalize_writes(writes: Sequence[Tuple[str, Any]], task_id: str) -> List[Tuple[str, str, Any]]:
    output: List[Tuple[str, str, Any]] = []
    for item in writes:
        if not isinstance(item, (list, tuple)) or len(item) < 2:
            continue
        channel = item[0]
        value = item[1]
        if isinstance(channel, str):
            output.append((task_id, channel, value))
    return output


def _normalize_filter(filter_data: Optional[Dict[str, Any]]) -> Dict[str, Any]:
    return filter_data if isinstance(filter_data, dict) else {}


def _match_filter(payload: Dict[str, Any], filters: Dict[str, Any]) -> bool:
    for key, value in filters.items():
        if payload.get(key) != value:
            return False
    return True


def _query_record_checkpoint_ns(payload: Dict[str, Any]) -> str:
    return _normalize_namespace(payload.get("checkpoint_ns"))


class AgentStateCheckpointSaver(_BaseCheckpointSaver):
    """LangGraph checkpoint saver that stores checkpoints in AgentState state records."""

    def __init__(
        self,
        client: AgentStateClient,
        agent_id: str = AGENT_ID_DEFAULT,
        state_key_prefix: str = CHECKPOINT_PREFIX_DEFAULT,
    ):
        self.client = client
        self.agent_id = agent_id
        self.state_key_prefix = state_key_prefix

    def _query_records(
        self,
        thread_id: str,
        checkpoint_ns: Optional[str],
        kind: str,
        *,
        limit: int = LIST_LIMIT_DEFAULT,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        filter_data: Optional[Dict[str, Any]] = None,
        cursor: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        collected: List[Dict[str, Any]] = []
        seen: set[str] = set()
        remaining = max(limit, 1)
        normalized_filter = _normalize_filter(filter_data)

        while len(collected) < limit:
            predicates = [
                {"path": "$.kind", "equals": kind},
                {"path": "$.runtime", "equals": RUNTIME},
                {"path": "$.thread_id", "equals": thread_id},
            ]
            if checkpoint_ns is not None:
                predicates.append({"path": "$.checkpoint_ns", "equals": checkpoint_ns})
            response = self.client.query_states(
                {
                    "agent_id": self.agent_id,
                    "tags": [
                        f"agentstate:{RUNTIME}",
                        f"agentstate:langgraph",
                        f"agentstate:{kind}",
                        f"agentstate:thread:{thread_id}",
                    ],
                    "predicates": predicates,
                    "limit": min(LIST_PAGE_SIZE, remaining),
                    "cursor": cursor,
                }
            )
            rows = response.get("data", []) if isinstance(response, dict) else []
            if not isinstance(rows, list):
                break

            for row in rows:
                if not isinstance(row, dict):
                    continue
                key = row.get("state_key")
                if not isinstance(key, str) or key in seen:
                    continue
                seen.add(key)

                payload = _safe_dict(row.get("data"))
                if normalized_filter and not _match_filter(payload, normalized_filter):
                    continue
                collected.append(row)

            next_cursor = _safe_dict(response.get("pagination")).get("next_cursor")
            if not next_cursor or not rows:
                break
            cursor = next_cursor
            remaining = limit - len(collected)

        sorted_rows = sorted(collected, key=lambda row: row.get("latest_sequence", 0), reverse=True)

        if before:
            before_checkpoint_id = _get_checkpoint_id(before)
            if before_checkpoint_id:
                split = next(
                    (
                        index
                        for index, row in enumerate(sorted_rows)
                        if _safe_dict(row.get("data")).get("checkpoint_id") == before_checkpoint_id
                    ),
                    None,
                )
                if split is not None:
                    sorted_rows = sorted_rows[split + 1 :]

        if after:
            after_checkpoint_id = _get_checkpoint_id(after)
            if after_checkpoint_id:
                split = next(
                    (
                        index
                        for index, row in enumerate(sorted_rows)
                        if _safe_dict(row.get("data")).get("checkpoint_id") == after_checkpoint_id
                    ),
                    None,
                )
                if split is not None:
                    sorted_rows = sorted_rows[:split]

        return sorted_rows[:limit]

    def _parse_pending_writes(self, thread_id: str, checkpoint_ns: str, checkpoint_id: str) -> List[Tuple[str, str, Any]]:
        if not checkpoint_id:
            return []

        rows = self._query_records(
            thread_id=thread_id,
            checkpoint_ns=checkpoint_ns,
            kind=WRITES_KIND,
            filter_data={"checkpoint_id": checkpoint_id},
            limit=LIST_PAGE_SIZE,
        )

        writes: List[Tuple[str, str, Any]] = []
        for row in rows:
            payload = _safe_dict(row.get("data"))
            encoded = payload.get("writes")
            decoded = _decode_envelope(encoded)
            for item in _safe_list(decoded):
                if not isinstance(item, (list, tuple)) or len(item) < 3:
                    continue
                task_id = item[0]
                channel = item[1]
                value = item[2]
                if isinstance(task_id, str) and isinstance(channel, str):
                    writes.append((task_id, channel, value))
        return writes

    def _to_tuple(
        self,
        thread_id: str,
        checkpoint_ns: str,
        state: Dict[str, Any],
    ) -> Tuple[
        Dict[str, Any],
        Dict[str, Any],
        Dict[str, Any],
        Optional[Dict[str, Any]],
        Optional[List[Tuple[str, str, Any]]],
    ]:
        data = _safe_dict(state.get("data"))
        checkpoint_id = data.get("checkpoint_id")
        if not isinstance(checkpoint_id, str):
            return (
                {"configurable": {"thread_id": thread_id, "checkpoint_ns": checkpoint_ns}},
                {},
                {},
                None,
                None,
            )

        checkpoint = _decode_envelope(data.get("checkpoint"))
        metadata = _decode_envelope(data.get("metadata"))
        parent_id = data.get("parent_checkpoint_id")
        parent_config = None
        if isinstance(parent_id, str):
            parent_config = {
                "configurable": {
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": parent_id,
                },
            }

        pending_writes = self._parse_pending_writes(thread_id, checkpoint_ns, checkpoint_id)

        return (
            {"configurable": {"thread_id": thread_id, "checkpoint_ns": checkpoint_ns, "checkpoint_id": checkpoint_id}},
            _safe_dict(checkpoint),
            _safe_dict(metadata),
            parent_config,
            pending_writes or None,
        )

    def get_tuple(self, config: Dict[str, Any]) -> Optional[
        Tuple[
            Dict[str, Any],
            Dict[str, Any],
            Dict[str, Any],
            Optional[Dict[str, Any]],
            Optional[List[Tuple[str, str, Any]]],
        ]
    ]:
        thread_id = _get_thread_id(config)
        checkpoint_ns = _get_checkpoint_ns(config)
        checkpoint_id = _get_checkpoint_id(config)

        if checkpoint_id:
            key = _build_checkpoint_key(self.state_key_prefix, thread_id, checkpoint_ns, checkpoint_id)
            try:
                state = self.client.get_state(key)
            except Exception:
                return None
            if isinstance(state, dict):
                return self._to_tuple(thread_id, checkpoint_ns, state)
            return None

        records = self._query_records(thread_id, checkpoint_ns, CHECKPOINT_KIND, limit=1)
        if not records:
            return None
        return self._to_tuple(thread_id, checkpoint_ns, records[0])

    def list(
        self,
        config: Optional[Dict[str, Any]],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> Iterator[
        Tuple[
            Dict[str, Any],
            Dict[str, Any],
            Dict[str, Any],
            Optional[Dict[str, Any]],
            Optional[List[Tuple[str, str, Any]]],
        ]
    ]:
        thread_id = _get_thread_id(config if config is not None else {})
        checkpoint_ns = _get_checkpoint_ns(config if config is not None else {})
        max_items = min(limit or LIST_LIMIT_DEFAULT, LIST_PAGE_SIZE)
        rows = self._query_records(
            thread_id=thread_id,
            checkpoint_ns=checkpoint_ns,
            kind=CHECKPOINT_KIND,
            limit=max_items,
            before=before,
            after=after,
            filter_data=_normalize_filter(filter),
        )
        for row in rows[:max_items]:
            yield self._to_tuple(thread_id, checkpoint_ns, row)

    def put(
        self,
        config: Dict[str, Any],
        checkpoint: Dict[str, Any],
        metadata: Dict[str, Any],
        new_versions: Dict[str, Any],
    ) -> Dict[str, Any]:
        thread_id = _get_thread_id(config)
        checkpoint_ns = _get_checkpoint_ns(config)
        parent_checkpoint_id = _get_checkpoint_id(config)
        checkpoint_id = _extract_checkpoint_id(checkpoint) or uuid.uuid4().hex
        versions = _extract_versions(new_versions)
        if not versions:
            versions = _extract_versions(checkpoint)

        self.client.upsert_state(
            _build_checkpoint_key(self.state_key_prefix, thread_id, checkpoint_ns, checkpoint_id),
            {
                "agent_id": self.agent_id,
                "data": {
                    "kind": CHECKPOINT_KIND,
                    "runtime": RUNTIME,
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                    "parent_checkpoint_id": parent_checkpoint_id,
                    "checkpoint": _encode_envelope(checkpoint),
                    "metadata": _encode_envelope(metadata),
                    "versions": versions,
                },
                "metadata": {"runtime": RUNTIME, "kind": CHECKPOINT_KIND},
                "tags": [
                    "agentstate:langgraph",
                    "agentstate:checkpoint",
                    f"agentstate:thread:{thread_id}",
                ],
            },
        )

        return {
            "configurable": {
                "thread_id": thread_id,
                "checkpoint_ns": checkpoint_ns,
                "checkpoint_id": checkpoint_id,
            },
        }

    def put_writes(
        self,
        config: Dict[str, Any],
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:
        thread_id = _get_thread_id(config)
        checkpoint_ns = _get_checkpoint_ns(config)
        checkpoint_id = _get_checkpoint_id(config)
        if not checkpoint_id:
            raise ValueError("Cannot store writes without config.configurable.checkpoint_id")

        normalized_writes = _normalize_writes(writes, task_id)
        self.client.upsert_state(
            _build_writes_key(self.state_key_prefix, thread_id, checkpoint_ns, checkpoint_id, task_id),
            {
                "agent_id": self.agent_id,
                "data": {
                    "kind": WRITES_KIND,
                    "runtime": RUNTIME,
                    "thread_id": thread_id,
                    "checkpoint_ns": checkpoint_ns,
                    "checkpoint_id": checkpoint_id,
                    "task_id": task_id,
                    "task_path": task_path,
                    "writes": _encode_envelope(normalized_writes),
                },
                "metadata": {
                    "runtime": RUNTIME,
                    "kind": WRITES_KIND,
                    "task_id": task_id,
                    "task_path": task_path,
                    "checkpoint_id": checkpoint_id,
                },
                "tags": [
                    "agentstate:langgraph",
                    "agentstate:checkpoint-write",
                    f"agentstate:thread:{thread_id}",
                ],
            },
        )

    def delete_thread(self, thread_id: str) -> None:
        checkpoint_rows = self._query_records(
            thread_id=thread_id,
            checkpoint_ns=None,
            kind=CHECKPOINT_KIND,
            limit=1_000_000,
        )
        writes_rows = self._query_records(
            thread_id=thread_id,
            checkpoint_ns=None,
            kind=WRITES_KIND,
            limit=1_000_000,
        )
        for row in checkpoint_rows + writes_rows:
            key = row.get("state_key")
            if isinstance(key, str):
                self.client.delete_state(key)


class AsyncAgentStateCheckpointSaver(_AsyncBaseCheckpointSaver):
    """Asynchronous variant of :class:`AgentStateCheckpointSaver`."""

    def __init__(
        self,
        client: AgentStateClient,
        agent_id: str = AGENT_ID_DEFAULT,
        state_key_prefix: str = CHECKPOINT_PREFIX_DEFAULT,
    ):
        self._sync = AgentStateCheckpointSaver(
            client,
            agent_id=agent_id,
            state_key_prefix=state_key_prefix,
        )

    def _run(self, func, *args, **kwargs):
        loop = asyncio.get_running_loop()
        return loop.run_in_executor(None, lambda: func(*args, **kwargs))

    async def aget_tuple(self, config: Dict[str, Any]):  # noqa: ANN001
        return await self._run(self._sync.get_tuple, config)

    async def alist(
        self,
        config: Optional[Dict[str, Any]],
        *,
        filter: Optional[Dict[str, Any]] = None,
        before: Optional[Dict[str, Any]] = None,
        after: Optional[Dict[str, Any]] = None,
        limit: Optional[int] = None,
    ) -> AsyncGenerator[
        Tuple[
            Dict[str, Any],
            Dict[str, Any],
            Dict[str, Any],
            Optional[Dict[str, Any]],
            Optional[List[Tuple[str, str, Any]]],
        ],
        None,
    ]:
        for item in self._sync.list(
            config,
            filter=filter,
            before=before,
            after=after,
            limit=limit,
        ):
            yield item

    async def aput(self, config: Dict[str, Any], checkpoint: Dict[str, Any], metadata: Dict[str, Any], new_versions: Dict[str, Any]):  # noqa: ANN001
        return await self._run(self._sync.put, config, checkpoint, metadata, new_versions)

    async def aput_writes(
        self,
        config: Dict[str, Any],
        writes: Sequence[Tuple[str, Any]],
        task_id: str,
        task_path: str = "",
    ) -> None:  # noqa: ANN001
        return await self._run(self._sync.put_writes, config, writes, task_id, task_path)

    async def adelete_thread(self, thread_id: str) -> None:
        return await self._run(self._sync.delete_thread, thread_id)
