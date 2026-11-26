-- HU-3 Registro y seguimiento de tickets.
CREATE TABLE tickets (
  id VARCHAR(12) PRIMARY KEY,
  codigo VARCHAR(20) NOT NULL UNIQUE,
  usuario_id VARCHAR(10) NOT NULL,
  categoria_id VARCHAR(10) NULL,
  subcategoria_id VARCHAR(10) NULL,
  ambiente_id VARCHAR(10) NULL,
  asunto VARCHAR(120) NULL,
  descripcion VARCHAR(600) NULL,
  prioridad VARCHAR(10) NULL,
  tiempo_esperado_horas SMALLINT UNSIGNED NULL,
  asignado_a VARCHAR(10) NULL,
  estado VARCHAR(20) NOT NULL,
  creado_en DATETIME NULL,
  cerrado_en DATETIME NULL,
  CONSTRAINT fk_tickets_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios (id),
  CONSTRAINT fk_tickets_categoria FOREIGN KEY (categoria_id) REFERENCES categorias (id),
  CONSTRAINT fk_tickets_subcategoria FOREIGN KEY (subcategoria_id) REFERENCES subcategorias (id),
  CONSTRAINT fk_tickets_ambiente FOREIGN KEY (ambiente_id) REFERENCES ambientes (id),
  CONSTRAINT fk_tickets_tecnico FOREIGN KEY (asignado_a) REFERENCES usuarios (id)
);
