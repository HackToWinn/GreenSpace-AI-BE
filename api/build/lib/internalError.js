export function internalError(res, msg, error) {
    console.error(msg, error);
    return res.status(500).json({
        error: msg,
        details: error instanceof Error ? error.message : undefined,
    });
}
