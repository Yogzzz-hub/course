class ApiError(Exception):
    """An error the front end can show. Every failure uses the same JSON shape."""

    def __init__(
        self,
        status: int,
        code: str,
        message: str,
        fields: dict[str, str] | None = None,
        details: dict | None = None,
    ):
        super().__init__(message)
        self.status = status
        self.code = code
        self.message = message
        self.fields = fields
        self.details = details
