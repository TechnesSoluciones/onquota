"""
Custom exceptions para módulo SPA
"""


class SPAException(Exception):
    """Excepción base para errores de SPA."""
    pass


class SPAFileInvalidException(SPAException):
    """Archivo inválido o corrupto."""
    pass


class SPABPIDNotFoundException(SPAException):
    """BPID no encontrado en sistema."""
    pass


class SPAClientNotFoundException(SPAException):
    """Cliente no encontrado."""
    pass


class SPACalculationException(SPAException):
    """Error en cálculos de descuento/precio."""
    pass


class SPADuplicateException(SPAException):
    """SPA duplicado para mismo cliente/artículo/fechas."""
    pass


class SPAValidationException(SPAException):
    """Error de validación de datos de negocio."""
    pass
