
from clases_calculadora import *

if __name__ == "__main__":
    head_ang = 72.5

    configs = [
        ("Canyon-SanLazaro(p(110,-6)e(27.5)m(74))",    (110.0, -6.0, 27.5, 74.0, 0.0)),
        ("Ahora(p(100,+6)e(15)m(70))", (100.0,  6.0, 12.0, 70.0, 0.0)),
        ("Ahora mas bajo(p(100,+6)e(15)m(70))", (100.0,  6.0, 10, 70.0, 0.0)),
        ("Ahora 110(p(100,+6)e(15)m(70))", (110.0,  6.0, 5, 70.0, 0.0)),
        
        
        
    ]

    dibuja(head_ang, configs)
