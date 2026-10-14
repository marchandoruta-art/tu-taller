-- Datos identificativos de cada taller.
--
-- El recibo de deposito de vehiculo que el taller imprime y entrega al cliente
-- llevaba la razon social escrita dentro del codigo:
--
--   <div class="company">TALLER AUTOS FORMENTERA ES BROLLS S.L.</div>
--
-- Mientras hubo un solo taller no se noto. En cuanto la aplicacion se venda a
-- otro, ese taller estaria entregando a SUS clientes un documento con la
-- empresa de otro. Y es un documento con valor probatorio: acredita en que
-- estado se recibio el vehiculo y quien lo custodia.
--
-- Estos datos pasan a ser de cada taller.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS razon_social  text,
  ADD COLUMN IF NOT EXISTS nif           text,
  ADD COLUMN IF NOT EXISTS direccion     text,
  ADD COLUMN IF NOT EXISTS codigo_postal text,
  ADD COLUMN IF NOT EXISTS poblacion     text,
  ADD COLUMN IF NOT EXISTS provincia     text,
  ADD COLUMN IF NOT EXISTS telefono      text,
  ADD COLUMN IF NOT EXISTS email         text;

COMMENT ON COLUMN public.organizations.razon_social IS
  'Nombre fiscal completo. Es el que figura en los documentos que se entregan al cliente; `name` es el nombre comercial que se ve en pantalla.';

-- El taller que ya existe conserva lo que venia impreso hasta hoy, para que el
-- documento no salga en blanco mientras no lo rellenen.
UPDATE public.organizations
SET razon_social = 'TALLER AUTOS FORMENTERA ES BROLLS S.L.'
WHERE slug = 'taller-mkhagdg7' AND razon_social IS NULL;
