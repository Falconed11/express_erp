/**
 * @typedef {Object} CRUDModel
 * @property {(data: any) => Promise<any>} create
 * @property {(params: {limit?: number, offset?: number, [key: string]: any}) => Promise<any[]>} getAll
 * @property {(id: number) => Promise<any>} getById
 * @property {(id: number, data: any) => Promise<any>} patch
 * @property {(id: number) => Promise<any>} destroy
 */
