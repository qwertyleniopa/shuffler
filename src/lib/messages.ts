export type ClientMessage =
  | { name: 'drawCard' }
  | { name: 'useCard'; data: number };

export type ServerMessage = { name: 'updateCards'; data: string[] };
