# Compare

**Descubra qual embalagem compensa mais.** Uma ferramenta gratuita e acessível para comparar o preço por litro, quilo, metro ou unidade no mercado. Feita para quem tem dificuldade com contas, com letra grande, botões grandes e linguagem simples.

## Princípios

- Sem anúncios, sem cookies, sem cadastro.
- Não guarda preços nem nada que identifique a pessoa.
- Funciona em celular simples.
- Compara só o preço, não a qualidade.

## Arquivos

| Arquivo | Para que serve |
|---|---|
| `index.html` | A página |
| `app.js` | As contas, a validação dos campos e o feedback |
| `style.css` | Cores e letras |
| `_headers` | Proteções de segurança |
| `functions/api/feedback.js` | Recebe o "Esta comparação te ajudou?" e o comentário opcional |

Não há regras para atualizar: litro, quilo e metro não mudam. A manutenção é quase zero.

## Feedback

As respostas ficam num banco D1 da Cloudflare. **Não precisa rodar nenhum comando:** na primeira resposta, a função cria as tabelas sozinha (ou acrescenta as colunas que faltarem, se o banco for antigo), sem apagar nada.

Na Cloudflare, no projeto deste site: **Settings › Bindings › Add › D1 database**, com Variable name `DB` e o banco escolhido. Depois, faça um **Retry deployment**.

Para ver as respostas, no Console do banco:

```sql
SELECT criado_em, voto, contexto, comentario FROM feedback WHERE ferramenta = 'compare' ORDER BY id DESC;
```

## Publicar

Repositório no GitHub ligado ao Cloudflare Pages: Framework preset **None**, Build command e Build output directory **vazios**. Cada commit publica sozinho.
