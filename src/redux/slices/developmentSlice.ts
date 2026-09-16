import { createSlice, createAsyncThunk, type PayloadAction } from '@reduxjs/toolkit';
import { toast } from 'sonner';
import * as devApi from '@/api/developmentApi';
import type {
  CardFieldsData,
  CreateBoardData,
  CreateCardData,
  DevBoard,
  DevCard,
  DevCardComment,
  DevChecklistItem,
  DevLabel,
  DevList,
  UpdateBoardData,
} from '@/types/development.types';

/**
 * The open board is normalised: lists sorted by position, cards by id, and
 * the per-list order as arrays of ids. Drag-and-drop edits the order arrays
 * optimistically; a failed save restores the snapshot taken before the drag.
 */
export interface BoardSnapshot {
  lists: DevList[];
  cardIdsByList: Record<string, string[]>;
  cardsById: Record<string, DevCard>;
}

interface DevelopmentState extends BoardSnapshot {
  boards: DevBoard[];
  boardsLoading: boolean;
  board: DevBoard | null;
  boardLoading: boolean;
  comments: DevCardComment[];
  commentsLoading: boolean;
  error: string | null;
}

const initialState: DevelopmentState = {
  boards: [],
  boardsLoading: false,
  board: null,
  boardLoading: false,
  lists: [],
  cardIdsByList: {},
  cardsById: {},
  comments: [],
  commentsLoading: false,
  error: null,
};

const errorMessage = (error: unknown, fallback: string) =>
  (error as { response?: { data?: { message?: string } } })?.response?.data?.message || fallback;

const thunk = <Arg, Result>(name: string, run: (arg: Arg) => Promise<Result>, fallback: string, successToast?: string) =>
  createAsyncThunk<Result, Arg, { rejectValue: string }>(`development/${name}`, async (arg, { rejectWithValue }) => {
    try {
      const result = await run(arg);
      if (successToast) toast.success(successToast);
      return result;
    } catch (error) {
      const message = errorMessage(error, fallback);
      toast.error(message);
      return rejectWithValue(message);
    }
  });

// ── Boards ────────────────────────────────────────────────────────────────────

export const fetchBoards = thunk(
  'fetchBoards',
  async (params: { archived?: 'true' | 'false' | 'all'; search?: string } | undefined) =>
    (await devApi.getBoards(params)).data,
  'Failed to load boards'
);

export const createBoard = thunk(
  'createBoard',
  async (payload: CreateBoardData) => (await devApi.createBoard(payload)).data,
  'Failed to create board',
  'Board created'
);

export const updateBoard = thunk(
  'updateBoard',
  async ({ id, data }: { id: string; data: UpdateBoardData }) => (await devApi.updateBoard(id, data)).data,
  'Failed to update board'
);

export const deleteBoard = thunk(
  'deleteBoard',
  async (id: string) => {
    await devApi.deleteBoard(id);
    return id;
  },
  'Failed to delete board',
  'Board deleted'
);

export const setBoardMembers = thunk(
  'setBoardMembers',
  async ({ id, members }: { id: string; members: string[] }) => (await devApi.setBoardMembers(id, members)).data,
  'Failed to update members',
  'Members updated'
);

export const addLabel = thunk(
  'addLabel',
  async ({ boardId, name, color }: { boardId: string; name: string; color: string }) =>
    (await devApi.addLabel(boardId, { name, color })).data,
  'Failed to add label'
);

export const updateLabel = thunk(
  'updateLabel',
  async ({ boardId, labelId, ...data }: { boardId: string; labelId: string; name?: string; color?: string }) =>
    (await devApi.updateLabel(boardId, labelId, data)).data,
  'Failed to update label'
);

export const deleteLabel = thunk(
  'deleteLabel',
  async ({ boardId, labelId }: { boardId: string; labelId: string }) => ({
    labelId,
    labels: (await devApi.deleteLabel(boardId, labelId)).data,
  }),
  'Failed to remove label'
);

export const fetchBoardFull = thunk(
  'fetchBoardFull',
  async (id: string) => (await devApi.getBoardFull(id)).data,
  'Failed to load board'
);

// ── Lists ─────────────────────────────────────────────────────────────────────

export const createList = thunk(
  'createList',
  async ({ boardId, name }: { boardId: string; name: string }) => (await devApi.createList(boardId, name)).data,
  'Failed to add list'
);

export const renameList = thunk(
  'renameList',
  async ({ id, name }: { id: string; name: string }) => (await devApi.updateList(id, name)).data,
  'Failed to rename list'
);

export const deleteList = thunk(
  'deleteList',
  async (id: string) => {
    await devApi.deleteList(id);
    return id;
  },
  'Failed to delete list'
);

/** Persist a column order already applied locally; restore the snapshot if the server refuses. */
export const reorderLists = createAsyncThunk<DevList[], { boardId: string; listIds: string[]; snapshot: BoardSnapshot }>(
  'development/reorderLists',
  async ({ boardId, listIds, snapshot }, { dispatch, rejectWithValue }) => {
    try {
      return (await devApi.reorderLists(boardId, listIds)).data;
    } catch (error) {
      dispatch(restoreSnapshot(snapshot));
      const message = errorMessage(error, 'Failed to reorder lists');
      toast.error(message);
      return rejectWithValue(message);
    }
  }
);

// ── Cards ─────────────────────────────────────────────────────────────────────

export const createCard = thunk(
  'createCard',
  async ({ boardId, data }: { boardId: string; data: CreateCardData }) => (await devApi.createCard(boardId, data)).data,
  'Failed to add card'
);

export const updateCard = thunk(
  'updateCard',
  async ({ id, data }: { id: string; data: CardFieldsData }) => (await devApi.updateCard(id, data)).data,
  'Failed to update card'
);

export const deleteCard = thunk(
  'deleteCard',
  async (id: string) => {
    await devApi.deleteCard(id);
    return id;
  },
  'Failed to delete card',
  'Card deleted'
);

/** Persist a card move already applied locally; restore the snapshot if the server refuses. */
export const moveCard = createAsyncThunk<
  Awaited<ReturnType<typeof devApi.moveCard>>['data'],
  { cardId: string; listId: string; position: number; snapshot: BoardSnapshot }
>('development/moveCard', async ({ cardId, listId, position, snapshot }, { dispatch, rejectWithValue }) => {
  try {
    return (await devApi.moveCard(cardId, { listId, position })).data;
  } catch (error) {
    dispatch(restoreSnapshot(snapshot));
    const message = errorMessage(error, 'Failed to move card');
    toast.error(message);
    return rejectWithValue(message);
  }
});

export const addChecklistItem = thunk(
  'addChecklistItem',
  async ({ cardId, text }: { cardId: string; text: string }) => ({
    cardId,
    checklist: (await devApi.addChecklistItem(cardId, text)).data,
  }),
  'Failed to add item'
);

export const updateChecklistItem = thunk(
  'updateChecklistItem',
  async ({ cardId, itemId, ...data }: { cardId: string; itemId: string; text?: string; done?: boolean }) => ({
    cardId,
    checklist: (await devApi.updateChecklistItem(cardId, itemId, data)).data,
  }),
  'Failed to update item'
);

export const deleteChecklistItem = thunk(
  'deleteChecklistItem',
  async ({ cardId, itemId }: { cardId: string; itemId: string }) => ({
    cardId,
    checklist: (await devApi.deleteChecklistItem(cardId, itemId)).data,
  }),
  'Failed to remove item'
);

// ── Comments ──────────────────────────────────────────────────────────────────

export const fetchComments = thunk(
  'fetchComments',
  async (cardId: string) => (await devApi.getComments(cardId)).data,
  'Failed to load comments'
);

export const addComment = thunk(
  'addComment',
  async ({ cardId, text }: { cardId: string; text: string }) => (await devApi.addComment(cardId, text)).data,
  'Failed to add comment'
);

export const deleteComment = thunk(
  'deleteComment',
  async (id: string) => {
    await devApi.deleteComment(id);
    return id;
  },
  'Failed to delete comment'
);

// ── Helpers ───────────────────────────────────────────────────────────────────

const setChecklist = (state: DevelopmentState, cardId: string, checklist: DevChecklistItem[]) => {
  const card = state.cardsById[cardId];
  if (card) card.checklist = checklist;
};

const setLabels = (state: DevelopmentState, labels: DevLabel[]) => {
  if (state.board) state.board.labels = labels;
};

const removeFromList = (state: DevelopmentState, listId: string, cardId: string) => {
  const ids = state.cardIdsByList[listId];
  if (ids) state.cardIdsByList[listId] = ids.filter((id) => id !== cardId);
};

// ── Slice ─────────────────────────────────────────────────────────────────────

const developmentSlice = createSlice({
  name: 'development',
  initialState,
  reducers: {
    clearBoard(state) {
      state.board = null;
      state.lists = [];
      state.cardIdsByList = {};
      state.cardsById = {};
      state.comments = [];
    },
    /** Optimistic: move a card to `toListId` at `toIndex` (within or across lists). */
    cardMovedLocally(state, action: PayloadAction<{ cardId: string; toListId: string; toIndex: number }>) {
      const { cardId, toListId, toIndex } = action.payload;
      const card = state.cardsById[cardId];
      if (!card) return;
      removeFromList(state, card.list, cardId);
      const dest = state.cardIdsByList[toListId] ?? (state.cardIdsByList[toListId] = []);
      const idx = Math.min(Math.max(toIndex, 0), dest.length);
      dest.splice(idx, 0, cardId);
      card.list = toListId;
    },
    /** Optimistic: apply a new column order. */
    listsReorderedLocally(state, action: PayloadAction<string[]>) {
      const byId = Object.fromEntries(state.lists.map((l) => [l._id, l]));
      state.lists = action.payload.map((id, i) => ({ ...byId[id], position: i })).filter((l) => l._id);
    },
    restoreSnapshot(state, action: PayloadAction<BoardSnapshot>) {
      state.lists = action.payload.lists;
      state.cardIdsByList = action.payload.cardIdsByList;
      state.cardsById = action.payload.cardsById;
    },
  },
  extraReducers: (builder) => {
    builder
      // Boards
      .addCase(fetchBoards.pending, (state) => {
        state.boardsLoading = true;
        state.error = null;
      })
      .addCase(fetchBoards.fulfilled, (state, action) => {
        state.boardsLoading = false;
        state.boards = action.payload;
      })
      .addCase(fetchBoards.rejected, (state, action) => {
        state.boardsLoading = false;
        state.error = action.payload as string;
      })
      .addCase(createBoard.fulfilled, (state, action) => {
        state.boards.unshift({ ...action.payload, listCount: 0, cardCount: 0 });
      })
      .addCase(updateBoard.fulfilled, (state, action) => {
        const b = action.payload;
        state.boards = state.boards.map((x) => (x._id === b._id ? { ...x, ...b } : x));
        if (state.board?._id === b._id) state.board = { ...state.board, ...b };
      })
      .addCase(deleteBoard.fulfilled, (state, action) => {
        state.boards = state.boards.filter((b) => b._id !== action.payload);
        if (state.board?._id === action.payload) developmentSlice.caseReducers.clearBoard(state);
      })
      .addCase(setBoardMembers.fulfilled, (state, action) => {
        if (state.board?._id === action.payload._id) state.board.members = action.payload.members;
      })
      .addCase(addLabel.fulfilled, (state, action) => setLabels(state, action.payload))
      .addCase(updateLabel.fulfilled, (state, action) => setLabels(state, action.payload))
      .addCase(deleteLabel.fulfilled, (state, action) => {
        setLabels(state, action.payload.labels);
        for (const card of Object.values(state.cardsById)) {
          card.labels = card.labels.filter((id) => id !== action.payload.labelId);
        }
      })

      // Open board
      .addCase(fetchBoardFull.pending, (state) => {
        state.boardLoading = true;
        state.error = null;
      })
      .addCase(fetchBoardFull.fulfilled, (state, action) => {
        const { board, lists, cards } = action.payload;
        state.boardLoading = false;
        state.board = board;
        state.lists = [...lists].sort((a, b) => a.position - b.position);
        state.cardsById = Object.fromEntries(cards.map((c) => [c._id, c]));
        const byList: Record<string, string[]> = Object.fromEntries(lists.map((l) => [l._id, []]));
        for (const c of [...cards].sort((a, b) => a.position - b.position)) {
          (byList[c.list] ?? (byList[c.list] = [])).push(c._id);
        }
        state.cardIdsByList = byList;
      })
      .addCase(fetchBoardFull.rejected, (state, action) => {
        state.boardLoading = false;
        state.error = action.payload as string;
      })

      // Lists
      .addCase(createList.fulfilled, (state, action) => {
        state.lists.push(action.payload);
        state.cardIdsByList[action.payload._id] = [];
      })
      .addCase(renameList.fulfilled, (state, action) => {
        const l = state.lists.find((x) => x._id === action.payload._id);
        if (l) l.name = action.payload.name;
      })
      .addCase(deleteList.fulfilled, (state, action) => {
        const id = action.payload;
        for (const cardId of state.cardIdsByList[id] ?? []) delete state.cardsById[cardId];
        delete state.cardIdsByList[id];
        state.lists = state.lists.filter((l) => l._id !== id).map((l, i) => ({ ...l, position: i }));
      })
      .addCase(reorderLists.fulfilled, (state, action) => {
        state.lists = [...action.payload].sort((a, b) => a.position - b.position);
      })

      // Cards
      .addCase(createCard.fulfilled, (state, action) => {
        const card = action.payload;
        state.cardsById[card._id] = card;
        (state.cardIdsByList[card.list] ?? (state.cardIdsByList[card.list] = [])).push(card._id);
      })
      .addCase(updateCard.fulfilled, (state, action) => {
        state.cardsById[action.payload._id] = action.payload;
      })
      .addCase(deleteCard.fulfilled, (state, action) => {
        const card = state.cardsById[action.payload];
        if (!card) return;
        removeFromList(state, card.list, card._id);
        delete state.cardsById[card._id];
      })
      .addCase(moveCard.fulfilled, (state, action) => {
        const { card, source, destination } = action.payload;
        state.cardIdsByList[source.list] = source.order;
        state.cardIdsByList[destination.list] = destination.order;
        state.cardsById[card._id] = card;
      })
      .addCase(addChecklistItem.fulfilled, (state, action) =>
        setChecklist(state, action.payload.cardId, action.payload.checklist)
      )
      .addCase(updateChecklistItem.fulfilled, (state, action) =>
        setChecklist(state, action.payload.cardId, action.payload.checklist)
      )
      .addCase(deleteChecklistItem.fulfilled, (state, action) =>
        setChecklist(state, action.payload.cardId, action.payload.checklist)
      )

      // Comments
      .addCase(fetchComments.pending, (state) => {
        state.commentsLoading = true;
      })
      .addCase(fetchComments.fulfilled, (state, action) => {
        state.commentsLoading = false;
        state.comments = action.payload;
      })
      .addCase(fetchComments.rejected, (state) => {
        state.commentsLoading = false;
      })
      .addCase(addComment.fulfilled, (state, action) => {
        state.comments.push(action.payload);
      })
      .addCase(deleteComment.fulfilled, (state, action) => {
        state.comments = state.comments.filter((c) => c._id !== action.payload);
      });
  },
});

export const { clearBoard, cardMovedLocally, listsReorderedLocally, restoreSnapshot } = developmentSlice.actions;

export default developmentSlice.reducer;
