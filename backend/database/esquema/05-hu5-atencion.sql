-- Tablas compartidas con HU-5 para mostrar la bitácora y la trazabilidad del ticket.
CREATE TABLE bitacora (
  id VARCHAR(12) PRIMARY KEY,
  ticket_id VARCHAR(12) NOT NULL,
  autor_id VARCHAR(10) NOT NULL,
  tipo VARCHAR(10) NOT NULL,
  mensaje VARCHAR(600) NOT NULL,
  creado_en DATETIME NOT NULL,
  CONSTRAINT fk_bitacora_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id),
  CONSTRAINT fk_bitacora_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id),
  INDEX idx_bitacora_ticket_fecha (ticket_id, creado_en)
);

CREATE TABLE historial (
  id VARCHAR(12) PRIMARY KEY,
  ticket_id VARCHAR(12) NOT NULL,
  tipo VARCHAR(20) NOT NULL,
  estado VARCHAR(20) NULL,
  asignado_a VARCHAR(10) NULL,
  autor_id VARCHAR(10) NOT NULL,
  motivo VARCHAR(600) NULL,
  retorno_estimado DATE NULL,
  solucion VARCHAR(600) NULL,
  creado_en DATETIME NOT NULL,
  CONSTRAINT fk_historial_ticket FOREIGN KEY (ticket_id) REFERENCES tickets (id),
  CONSTRAINT fk_historial_autor FOREIGN KEY (autor_id) REFERENCES usuarios (id),
  CONSTRAINT fk_historial_tecnico FOREIGN KEY (asignado_a) REFERENCES usuarios (id),
  INDEX idx_historial_ticket_fecha (ticket_id, creado_en)
);
