/**
 * A response body as JSON, or {} when there isn't any (a crashed server sends
 * an empty 500). Callers already fall back to a generic error message.
 */
export const readJson = async <T>(res: Response): Promise<Partial<T>> => {
  try {
    return (await res.json()) as Partial<T>;
  } catch (err) {
    console.warn(`response ${res.status} wasn't JSON`, err);
    return {};
  }
};
