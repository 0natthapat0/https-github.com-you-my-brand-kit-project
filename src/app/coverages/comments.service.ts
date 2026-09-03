import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';

export interface PageComment {
  id: string;
  author: string;
  avatarInitials: string;
  timestamp: string;
  text: string;
  x?: number;
  y?: number;
  pinNumber?: number;
  tab?: string;
  resolved?: boolean;
}

// Points at the local mock server in server/ by default — point these at your
// real backend whenever it's ready, the rest of the app doesn't need to change.
const API_URL = 'http://localhost:4310/api/comments';
const WS_URL = 'ws://localhost:4310';

export type CommentEvent =
  | { type: 'added'; comment: PageComment }
  | { type: 'updated'; comment: PageComment }
  | { type: 'deleted'; id: string };

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private socket: WebSocket | null = null;
  private events$ = new Subject<CommentEvent>();

  constructor(private http: HttpClient) {}

  list(): Observable<PageComment[]> {
    return this.http.get<PageComment[]>(API_URL);
  }

  create(comment: Omit<PageComment, 'id'>): Observable<PageComment> {
    return this.http.post<PageComment>(API_URL, comment);
  }

  update(id: string, changes: Partial<PageComment>): Observable<PageComment> {
    return this.http.patch<PageComment>(`${API_URL}/${id}`, changes);
  }

  delete(id: string): Observable<void> {
    return this.http.delete<void>(`${API_URL}/${id}`);
  }

  // Emits every add/update/delete made by *any* connected client (including this one).
  onCommentEvent(): Observable<CommentEvent> {
    this.connect();
    return this.events$.asObservable();
  }

  private connect(): void {
    if (this.socket) return;
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'comment:new' && msg.comment) {
          this.events$.next({ type: 'added', comment: msg.comment as PageComment });
        } else if (msg?.type === 'comment:update' && msg.comment) {
          this.events$.next({ type: 'updated', comment: msg.comment as PageComment });
        } else if (msg?.type === 'comment:delete' && msg.id) {
          this.events$.next({ type: 'deleted', id: msg.id as string });
        }
      } catch {
        // ignore malformed messages
      }
    };
    socket.onclose = () => {
      this.socket = null;
    };
    this.socket = socket;
  }
}
