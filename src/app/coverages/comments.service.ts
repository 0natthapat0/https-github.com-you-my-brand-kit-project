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
}

// Points at the local mock server in server/ by default — point these at your
// real backend whenever it's ready, the rest of the app doesn't need to change.
const API_URL = 'http://localhost:4310/api/comments';
const WS_URL = 'ws://localhost:4310';

@Injectable({ providedIn: 'root' })
export class CommentsService {
  private socket: WebSocket | null = null;
  private incoming$ = new Subject<PageComment>();

  constructor(private http: HttpClient) {}

  list(): Observable<PageComment[]> {
    return this.http.get<PageComment[]>(API_URL);
  }

  create(comment: Omit<PageComment, 'id'>): Observable<PageComment> {
    return this.http.post<PageComment>(API_URL, comment);
  }

  // Emits every comment created by *any* connected client (including this one).
  onCommentAdded(): Observable<PageComment> {
    this.connect();
    return this.incoming$.asObservable();
  }

  private connect(): void {
    if (this.socket) return;
    const socket = new WebSocket(WS_URL);
    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg?.type === 'comment:new' && msg.comment) {
          this.incoming$.next(msg.comment as PageComment);
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
