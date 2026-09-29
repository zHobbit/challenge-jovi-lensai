# Processo de desenvolvimento

Este documento conta o caminho do projeto LensAI até aqui: o que foi feito, em que ordem, as decisões tomadas e os problemas encontrados.

## Linha do tempo

| Data | Marco |
|---|---|
| 2026 (início) | Leitura do brief do Challenge JOVI (1TDS) e definição do problema da câmera |
| **20/05/2026** | ✅ **Entrega da Sprint 1**: deck em PDF com Negócio, MER e Protótipo Figma. **Nota 10** |
| 09/2026 | Brief da Sprint 2: transformar o conceito em front-end web funcional |
| 09/2026 | Primeira versão do protótipo web (Tailwind + JS puro) |
| 09/2026 | Rodada de refinamento de UI/UX e correção de bugs |
| 09/2026 | Redesign visual: fotos reais nas cenas e mockup no estilo do JOVI V70 5G |
| **~21/09/2026** | ✅ **Entrega da Sprint 2**: ZIP com o código e o PDF de 11 slides |
| 29/09/2026 | Documentação consolidada neste repositório |

---

## Sprint 1: do problema ao conceito

1. **Entender o brief.** A solução precisava ser 100% web, *mobile first*, simular captura, visualização e compartilhamento, e melhorar a *percepção* de desempenho.
2. **Definir o problema.** A maioria dos usuários não usa os ajustes manuais e culpa o hardware pela foto ruim (68% nunca configuram, 3x mais reclamações de "câmera fraca").
3. **Desenhar a solução.** A IA sugere ajustes e **explica** o porquê, com um score de foto, em vez de só corrigir no automático. Isso reforça o aprendizado e a percepção de qualidade.
4. **Modelar os dados.** Foram definidas as tabelas `USUARIO → SESSAO_CAMERA → ANALISE_CONTEXTO → SUGESTAO`, mais `PREFERENCIA_APRENDIDA` para personalização, com tipos no padrão Oracle.
5. **Prototipar no Figma.** Foram 9 telas, de Splash até Compartilhar, com tema escuro e destaques em roxo e âmbar.
6. **Montar o deck.** A apresentação teve 12 slides e passou por várias iterações de revisão visual. Ver [sprint-1](sprint-1/README.md).

## Sprint 2: do Figma ao código

### Decisões técnicas

| Decisão | Por quê |
|---|---|
| **Tailwind CSS** em vez de Bootstrap | Deixa o visual mais livre e fiel à identidade escura e *glass* da Sprint 1 |
| **Tailwind e fonte embutidos em `vendor/`** | A entrega precisava funcionar **offline** e sem links externos |
| **Câmera simulada**, sem `getUserMedia` real | Pelo protocolo `file://` a página não é um contexto seguro, então a câmera real não abriria. A simulação garante que o fluxo funcione em qualquer máquina |
| **JavaScript puro em um único IIFE** | Fica dentro do escopo permitido e sem dependências |
| **`localStorage` para a galeria** | Dá persistência entre visitas sem precisar de back-end. O wrapper tolera o modo privado |
| **Landing em scrollytelling** com o protótipo dentro | Junta a narrativa de negócio (Sprint 1) com a demo interativa (Sprint 2) numa página só |

### Iterações

1. **Primeira versão:** todas as telas e a jornada completa (splash → permissão → câmera → sugestão → captura → galeria → detalhe).
2. **Refinamento de UI/UX:** aplicamos boas práticas de hierarquia visual, estados de foco, acessibilidade e microinterações.
3. **Redesign visual:**
   - As cenas abstratas feitas com gradientes CSS deram lugar a **fotos reais**, uma foto própria mais 5 fotos de licença livre do Pexels.
   - O mockup do aparelho passou a lembrar o **vivo/JOVI V70 5G**, com câmera em furo e moldura azul-safira.
   - Entraram recursos autênticos do V70: as focais do Retrato (23/35/50/85 mm), o selo "200 MP · OIS", a faixa de cores e os chips de especificações.
4. **Apresentação:** o deck de 11 slides foi escrito em HTML com a identidade da LensAI e renderizado em PDF 16:9 com o Chrome headless. As telas vieram do próprio protótipo, pelo modo `?kiosk=1&screen=`.

### Bugs encontrados e corrigidos

| Bug | Causa | Correção |
|---|---|---|
| Botões âmbar sem fundo | As variáveis CSS eram definidas como `--amber-2`, mas usadas como `--amber2` | Padronizamos `--amber2`/`--purple2` e mantivemos aliases de compatibilidade |
| A métrica de desempenho mostrava cerca de 14000 ms | Ela media o tempo até o celular aparecer no scroll, e não o carregamento | Passamos a medir com `performance.now()` no *init*, o que dá cerca de 88 ms |

### Ferramentas

- **Figma** para o protótipo da Sprint 1.
- **VS Code / Claude Code** para desenvolvimento assistido por IA, revisão de código e geração de assets. Foram usadas as skills `frontend-design` e `ui-ux-pro-max` no refinamento.
- **Chrome headless** para as capturas de tela e a geração do PDF.
- **Python `http.server`** para o preview local.

---

## Próximos passos

- Integrar a câmera real (`getUserMedia`) quando o protótipo for servido por HTTPS.
- Criar um back-end e um banco que implementem o MER da Sprint 1 (sessões, análises, sugestões e preferências aprendidas).
- Trocar a heurística de score por um modelo de visão computacional.
