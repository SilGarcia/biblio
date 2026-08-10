/*
================================================================
 SISTEMA DE BIBLIOTECA
================================================================

 Tecnologias:
 - HTML
 - CSS
 - JavaScript
 - AlaSQL

 Objetivo:
 Demonstrar de forma simples como um formulário do front-end
 pode realizar operações SQL em um banco executado no navegador.

 Tabelas utilizadas:
 1. livros
 2. leitores
 3. emprestimos

 Observação:
 O AlaSQL funciona no navegador.
 O localStorage é utilizado para guardar os dados localmente
 e permitir que eles continuem disponíveis após recarregar a
 página no mesmo navegador.
================================================================
*/


// ================================================================
// CONFIGURAÇÕES
// ================================================================

// Nome utilizado para identificar os dados no localStorage.
const CHAVE_STORAGE = "biblioteca_aulasql_simples_v1";

// Indica se o banco já foi criado.
let bancoInicializado = false;


// ================================================================
// FUNÇÕES AUXILIARES
// ================================================================

/*
    Escapa aspas simples antes de colocar um texto dentro
    de uma instrução SQL.

    Exemplo:
    O'Connor

    será convertido para:

    O''Connor
*/
function protegerTexto(texto) {

    if (texto === null || texto === undefined) {
        return "";
    }

    return String(texto).replace(/'/g, "''");
}


/*
    Evita que textos cadastrados pelo usuário sejam interpretados
    como HTML quando forem exibidos na tabela.
*/
function protegerHTML(texto) {

    return String(texto ?? "")
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
}


/*
    Mostra uma mensagem rápida na tela.
*/
function mostrarMensagem(texto, erro = false) {

    const elemento = document.getElementById("mensagem");

    elemento.textContent = texto;

    elemento.className = "mensagem exibir";

    if (erro) {
        elemento.classList.add("erro");
    }

    clearTimeout(mostrarMensagem.timer);

    mostrarMensagem.timer = setTimeout(() => {
        elemento.className = "mensagem";
    }, 3000);
}


/*
    Descobre o próximo ID disponível.

    Exemplo:

    Se a tabela possui:
    1
    2
    3

    o próximo ID será:
    4
*/
function proximoId(tabela) {

    // Em vez de usar MAX(id) com alias, buscamos o maior ID
    // pela ordenação. Isso evita incompatibilidades do parser
    // do AlaSQL com algumas expressões agregadas.
    const resultado = alasql(`
        SELECT id
        FROM ${tabela}
        ORDER BY id DESC
    `);

    if (resultado.length === 0) {
        return 1;
    }

    return Number(resultado[0].id) + 1;
}


// ================================================================
// PERSISTÊNCIA NO LOCALSTORAGE
// ================================================================

/*
    Copia os dados das tabelas do AlaSQL para o localStorage.

    Isso não transforma o localStorage em um banco SQL.
    O banco continua sendo o AlaSQL.

    O localStorage serve apenas para manter os dados quando
    a página for recarregada.
*/
function salvarDados() {

    const dados = {

        livros: alasql(`
            SELECT *
            FROM livros
        `),

        leitores: alasql(`
            SELECT *
            FROM leitores
        `),

        emprestimos: alasql(`
            SELECT *
            FROM emprestimos
        `)
    };

    localStorage.setItem(
        CHAVE_STORAGE,
        JSON.stringify(dados)
    );
}


/*
    Recupera os dados que estavam armazenados no localStorage
    e insere novamente nas tabelas do AlaSQL.
*/
function restaurarDados() {

    const dadosSalvos = localStorage.getItem(CHAVE_STORAGE);

    // Se não existe armazenamento anterior,
    // não há nada para restaurar.
    if (!dadosSalvos) {
        return false;
    }

    try {

        const dados = JSON.parse(dadosSalvos);


        // --------------------------------------------------------
        // RESTAURA LIVROS
        // --------------------------------------------------------

        (dados.livros || []).forEach(livro => {

            alasql(`
                INSERT INTO livros
                (id, titulo, autor, ano, categoria)
                VALUES (
                    ${Number(livro.id)},
                    '${protegerTexto(livro.titulo)}',
                    '${protegerTexto(livro.autor)}',
                    ${Number(livro.ano) || 0},
                    '${protegerTexto(livro.categoria)}'
                )
            `);
        });


        // --------------------------------------------------------
        // RESTAURA LEITORES
        // --------------------------------------------------------

        (dados.leitores || []).forEach(leitor => {

            alasql(`
                INSERT INTO leitores
                (id, nome, email, curso)
                VALUES (
                    ${Number(leitor.id)},
                    '${protegerTexto(leitor.nome)}',
                    '${protegerTexto(leitor.email)}',
                    '${protegerTexto(leitor.curso)}'
                )
            `);
        });


        // --------------------------------------------------------
        // RESTAURA EMPRÉSTIMOS
        // --------------------------------------------------------

        (dados.emprestimos || []).forEach(emprestimo => {

            alasql(`
                INSERT INTO emprestimos
                (id, livro_id, leitor_id, data_emprestimo, status)
                VALUES (
                    ${Number(emprestimo.id)},
                    ${Number(emprestimo.livro_id)},
                    ${Number(emprestimo.leitor_id)},
                    '${protegerTexto(emprestimo.data_emprestimo)}',
                    '${protegerTexto(emprestimo.status)}'
                )
            `);
        });


        return true;

    } catch (erro) {

        console.error("Erro ao restaurar os dados:", erro);

        // Se os dados estiverem corrompidos,
        // remove o armazenamento para permitir uma nova inicialização.
        localStorage.removeItem(CHAVE_STORAGE);

        return false;
    }
}


// ================================================================
// CRIAÇÃO DO BANCO DE DADOS
// ================================================================

/*
    Cria as três tabelas utilizadas pelo sistema.

    SQL utilizado:

    CREATE TABLE livros
    CREATE TABLE leitores
    CREATE TABLE emprestimos
*/
function criarBanco() {

    try {

        // --------------------------------------------------------
        // TABELA LIVROS
        // --------------------------------------------------------

        alasql(`
            CREATE TABLE livros (
                id INT PRIMARY KEY,
                titulo STRING,
                autor STRING,
                ano INT,
                categoria STRING
            )
        `);


        // --------------------------------------------------------
        // TABELA LEITORES
        // --------------------------------------------------------

        alasql(`
            CREATE TABLE leitores (
                id INT PRIMARY KEY,
                nome STRING,
                email STRING,
                curso STRING
            )
        `);


        // --------------------------------------------------------
        // TABELA EMPRÉSTIMOS
        // --------------------------------------------------------

        alasql(`
            CREATE TABLE emprestimos (
                id INT PRIMARY KEY,
                livro_id INT,
                leitor_id INT,
                data_emprestimo STRING,
                status STRING
            )
        `);


        // Tenta recuperar dados de uma utilização anterior.
        const recuperou = restaurarDados();


        // Se não existirem dados anteriores,
        // cadastra alguns registros iniciais.
        if (!recuperou) {
            inserirDadosIniciais();
        }


        bancoInicializado = true;

        atualizarSistema();

        console.log("Banco AlaSQL criado com sucesso.");

    } catch (erro) {

        console.error("Erro ao criar banco:", erro);

        mostrarMensagem(
            "Erro ao criar banco: " + erro.message,
            true
        );
    }
}


// ================================================================
// DADOS INICIAIS
// ================================================================

/*
    Insere alguns registros para que o aluno consiga abrir
    o sistema e visualizar o funcionamento imediatamente.

    Depois, os alunos podem apagar esses registros ou cadastrar
    seus próprios dados.
*/
function inserirDadosIniciais() {

    // ------------------------------
    // LIVROS
    // ------------------------------

    alasql(`
        INSERT INTO livros
        (id, titulo, autor, ano, categoria)
        VALUES
        (1, 'Dom Casmurro', 'Machado de Assis', 1899, 'Romance')
    `);

    alasql(`
        INSERT INTO livros
        (id, titulo, autor, ano, categoria)
        VALUES
        (2, 'O Cortiço', 'Aluísio Azevedo', 1890, 'Romance')
    `);


    // ------------------------------
    // LEITORES
    // ------------------------------

    alasql(`
        INSERT INTO leitores
        (id, nome, email, curso)
        VALUES
        (1, 'Ana Souza', 'ana@email.com', 'ADS')
    `);

    alasql(`
        INSERT INTO leitores
        (id, nome, email, curso)
        VALUES
        (2, 'Carlos Lima', 'carlos@email.com', 'Gestão')
    `);


    // ------------------------------
    // EMPRÉSTIMO
    // ------------------------------

    alasql(`
        INSERT INTO emprestimos
        (id, livro_id, leitor_id, data_emprestimo, status)
        VALUES
        (1, 1, 1, '2026-08-01', 'Ativo')
    `);


    // Salva os dados iniciais.
    salvarDados();
}


// ================================================================
// LIVROS - INSERT / UPDATE / DELETE
// ================================================================

/*
    Salva um livro.

    Se o campo livroId estiver vazio:
        INSERT

    Se o campo livroId possuir um número:
        UPDATE
*/
function salvarLivro(event) {

    event.preventDefault();

    try {

        const idEdicao =
            document.getElementById("livroId").value;

        const titulo =
            document.getElementById("titulo").value.trim();

        const autor =
            document.getElementById("autor").value.trim();

        const ano =
            Number(document.getElementById("ano").value) || 0;

        const categoria =
            document.getElementById("categoria").value.trim();


        if (!titulo || !autor) {

            mostrarMensagem(
                "Informe o título e o autor.",
                true
            );

            return;
        }


        // --------------------------------------------------------
        // UPDATE
        // --------------------------------------------------------

        if (idEdicao) {

            alasql(`
                UPDATE livros
                SET
                    titulo = '${protegerTexto(titulo)}',
                    autor = '${protegerTexto(autor)}',
                    ano = ${ano},
                    categoria = '${protegerTexto(categoria)}'
                WHERE id = ${Number(idEdicao)}
            `);

            mostrarMensagem("Livro atualizado com sucesso.");

        }

        // --------------------------------------------------------
        // INSERT
        // --------------------------------------------------------

        else {

            const id = proximoId("livros");

            alasql(`
                INSERT INTO livros
                (id, titulo, autor, ano, categoria)
                VALUES (
                    ${id},
                    '${protegerTexto(titulo)}',
                    '${protegerTexto(autor)}',
                    ${ano},
                    '${protegerTexto(categoria)}'
                )
            `);

            mostrarMensagem("Livro cadastrado com sucesso.");
        }


        salvarDados();

        limparLivro();

        atualizarSistema();

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao salvar livro: " + erro.message,
            true
        );
    }
}


/*
    Busca um livro pelo ID e coloca seus dados no formulário.
*/
function editarLivro(id) {

    const resultado = alasql(`
        SELECT *
        FROM livros
        WHERE id = ${Number(id)}
    `);

    const livro = resultado[0];

    if (!livro) {
        return;
    }

    document.getElementById("livroId").value = livro.id;
    document.getElementById("titulo").value = livro.titulo;
    document.getElementById("autor").value = livro.autor;
    document.getElementById("ano").value = livro.ano || "";
    document.getElementById("categoria").value =
        livro.categoria || "";

    document.getElementById("titulo").focus();
}


/*
    Exclui um livro.

    Antes de excluir, verifica se ele possui empréstimo ativo.
*/
function excluirLivro(id) {

    const resultado = alasql(`
        SELECT id
        FROM emprestimos
        WHERE livro_id = ${Number(id)}
        AND status = 'Ativo'
    `);

    if (resultado.length > 0) {

        mostrarMensagem(
            "Este livro possui um empréstimo ativo.",
            true
        );

        return;
    }


    if (!confirm("Deseja realmente excluir este livro?")) {
        return;
    }


    alasql(`
        DELETE FROM livros
        WHERE id = ${Number(id)}
    `);


    salvarDados();

    atualizarSistema();

    mostrarMensagem("Livro excluído.");
}


/*
    Limpa o formulário de livros.
*/
function limparLivro() {

    document.getElementById("formLivro").reset();

    document.getElementById("livroId").value = "";
}


// ================================================================
// LEITORES - INSERT / UPDATE / DELETE
// ================================================================

/*
    Salva um leitor.
*/
function salvarLeitor(event) {

    event.preventDefault();

    try {

        const idEdicao =
            document.getElementById("leitorId").value;

        const nome =
            document.getElementById("nomeLeitor").value.trim();

        const email =
            document.getElementById("emailLeitor").value.trim();

        const curso =
            document.getElementById("cursoLeitor").value.trim();


        if (!nome) {

            mostrarMensagem(
                "Informe o nome do leitor.",
                true
            );

            return;
        }


        // UPDATE
        if (idEdicao) {

            alasql(`
                UPDATE leitores
                SET
                    nome = '${protegerTexto(nome)}',
                    email = '${protegerTexto(email)}',
                    curso = '${protegerTexto(curso)}'
                WHERE id = ${Number(idEdicao)}
            `);

            mostrarMensagem("Leitor atualizado com sucesso.");
        }

        // INSERT
        else {

            const id = proximoId("leitores");

            alasql(`
                INSERT INTO leitores
                (id, nome, email, curso)
                VALUES (
                    ${id},
                    '${protegerTexto(nome)}',
                    '${protegerTexto(email)}',
                    '${protegerTexto(curso)}'
                )
            `);

            mostrarMensagem("Leitor cadastrado com sucesso.");
        }


        salvarDados();

        limparLeitor();

        atualizarSistema();

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao salvar leitor: " + erro.message,
            true
        );
    }
}


/*
    Carrega os dados de um leitor no formulário.
*/
function editarLeitor(id) {

    const resultado = alasql(`
        SELECT *
        FROM leitores
        WHERE id = ${Number(id)}
    `);

    const leitor = resultado[0];

    if (!leitor) {
        return;
    }

    document.getElementById("leitorId").value = leitor.id;
    document.getElementById("nomeLeitor").value = leitor.nome;
    document.getElementById("emailLeitor").value =
        leitor.email || "";
    document.getElementById("cursoLeitor").value =
        leitor.curso || "";

    document.getElementById("nomeLeitor").focus();
}


/*
    Exclui um leitor.

    Um leitor com empréstimo ativo não pode ser excluído.
*/
function excluirLeitor(id) {

    const resultado = alasql(`
        SELECT id
        FROM emprestimos
        WHERE leitor_id = ${Number(id)}
        AND status = 'Ativo'
    `);

    if (resultado.length > 0) {

        mostrarMensagem(
            "Este leitor possui um empréstimo ativo.",
            true
        );

        return;
    }


    if (!confirm("Deseja realmente excluir este leitor?")) {
        return;
    }


    alasql(`
        DELETE FROM leitores
        WHERE id = ${Number(id)}
    `);


    salvarDados();

    atualizarSistema();

    mostrarMensagem("Leitor excluído.");
}


/*
    Limpa o formulário de leitores.
*/
function limparLeitor() {

    document.getElementById("formLeitor").reset();

    document.getElementById("leitorId").value = "";
}


// ================================================================
// EMPRÉSTIMOS
// ================================================================

/*
    Registra um novo empréstimo.

    Aqui aparece um dos conceitos importantes:
    a tabela emprestimos utiliza o ID do livro e o ID do leitor.
*/
function salvarEmprestimo(event) {

    event.preventDefault();

    try {

        const livroId =
            Number(document.getElementById("livroEmprestimo").value);

        const leitorId =
            Number(document.getElementById("leitorEmprestimo").value);

        const data =
            document.getElementById("dataEmprestimo").value;


        if (!livroId || !leitorId || !data) {

            mostrarMensagem(
                "Preencha todos os campos.",
                true
            );

            return;
        }


        // Verifica se o livro já está emprestado.
        const existente = alasql(`
            SELECT id
            FROM emprestimos
            WHERE livro_id = ${livroId}
            AND status = 'Ativo'
        `);


        if (existente.length > 0) {

            mostrarMensagem(
                "Este livro já está emprestado.",
                true
            );

            return;
        }


        const id = proximoId("emprestimos");


        // INSERT do empréstimo.
        alasql(`
            INSERT INTO emprestimos
            (id, livro_id, leitor_id, data_emprestimo, status)
            VALUES (?, ?, ?, ?, ?)
        `, [
            id,
            livroId,
            leitorId,
            data,
            "Ativo"
        ]);


        salvarDados();

        document.getElementById("formEmprestimo").reset();

        definirDataAtual();

        atualizarSistema();

        mostrarMensagem(
            "Empréstimo registrado com sucesso."
        );

    } catch (erro) {

        console.error(erro);

        mostrarMensagem(
            "Erro ao registrar empréstimo: " +
            erro.message,
            true
        );
    }
}


/*
    Registra a devolução de um livro.

    Aqui utilizamos UPDATE.
*/
function devolverLivro(id) {

    alasql(`
        UPDATE emprestimos
        SET status = 'Devolvido'
        WHERE id = ${Number(id)}
    `);


    salvarDados();

    atualizarSistema();

    mostrarMensagem(
        "Livro devolvido com sucesso."
    );
}


// ================================================================
// CONSULTAS / SELECT
// ================================================================

/*
    Consulta todos os livros e coloca o resultado na tabela HTML.

    SQL utilizado:
    SELECT * FROM livros ORDER BY titulo
*/
function atualizarLivros() {

    const tabela =
        document.getElementById("tabelaLivros");


    const livros = alasql(`
        SELECT *
        FROM livros
        ORDER BY titulo
    `);


    if (livros.length === 0) {

        tabela.innerHTML = `
            <tr>
                <td colspan="6" class="vazio">
                    Nenhum livro cadastrado.
                </td>
            </tr>
        `;

        return;
    }


    tabela.innerHTML = livros.map(livro => `

        <tr>

            <td>${livro.id}</td>

            <td>
                <strong>
                    ${protegerHTML(livro.titulo)}
                </strong>
            </td>

            <td>
                ${protegerHTML(livro.autor)}
            </td>

            <td>
                ${livro.ano || "-"}
            </td>

            <td>
                ${protegerHTML(livro.categoria || "-")}
            </td>

            <td>

                <button
                    class="btn pequeno secundario"
                    onclick="editarLivro(${livro.id})">
                    Editar
                </button>

                <button
                    class="btn pequeno excluir"
                    onclick="excluirLivro(${livro.id})">
                    Excluir
                </button>

            </td>

        </tr>

    `).join("");
}


/*
    Consulta todos os leitores.
*/
function atualizarLeitores() {

    const tabela =
        document.getElementById("tabelaLeitores");


    const leitores = alasql(`
        SELECT *
        FROM leitores
        ORDER BY nome
    `);


    if (leitores.length === 0) {

        tabela.innerHTML = `
            <tr>
                <td colspan="5" class="vazio">
                    Nenhum leitor cadastrado.
                </td>
            </tr>
        `;

        return;
    }


    tabela.innerHTML = leitores.map(leitor => `

        <tr>

            <td>${leitor.id}</td>

            <td>
                <strong>
                    ${protegerHTML(leitor.nome)}
                </strong>
            </td>

            <td>
                ${protegerHTML(leitor.email || "-")}
            </td>

            <td>
                ${protegerHTML(leitor.curso || "-")}
            </td>

            <td>

                <button
                    class="btn pequeno secundario"
                    onclick="editarLeitor(${leitor.id})">
                    Editar
                </button>

                <button
                    class="btn pequeno excluir"
                    onclick="excluirLeitor(${leitor.id})">
                    Excluir
                </button>

            </td>

        </tr>

    `).join("");
}


/*
    Consulta os empréstimos utilizando JOIN.

    Este é um dos principais exemplos para explicar
    relacionamento entre tabelas.

    A tabela emprestimos possui:
        livro_id
        leitor_id

    O JOIN permite descobrir:
        título do livro
        nome do leitor
*/
function atualizarEmprestimos() {

    const tabela =
        document.getElementById("tabelaEmprestimos");


    const emprestimos = alasql(`

        SELECT
            e.id,
            l.titulo AS livro,
            r.nome AS leitor,
            e.data_emprestimo,
            e.status

        FROM emprestimos e

        JOIN livros l
            ON e.livro_id = l.id

        JOIN leitores r
            ON e.leitor_id = r.id

        ORDER BY e.id DESC

    `);


    if (emprestimos.length === 0) {

        tabela.innerHTML = `
            <tr>
                <td colspan="6" class="vazio">
                    Nenhum empréstimo cadastrado.
                </td>
            </tr>
        `;

        return;
    }


    tabela.innerHTML = emprestimos.map(item => `

        <tr>

            <td>${item.id}</td>

            <td>
                ${protegerHTML(item.livro)}
            </td>

            <td>
                ${protegerHTML(item.leitor)}
            </td>

            <td>
                ${formatarData(item.data_emprestimo)}
            </td>

            <td>
                ${item.status}
            </td>

            <td>

                ${
                    item.status === "Ativo"

                    ?

                    `<button
                        class="btn pequeno primario"
                        onclick="devolverLivro(${item.id})">
                        Devolver
                    </button>`

                    :

                    "Finalizado"
                }

            </td>

        </tr>

    `).join("");
}


/*
    Atualiza os <select> de livros e leitores.

    Os dados são obtidos por SELECT no AlaSQL.
*/
function atualizarSelects() {

    const livros = alasql(`
        SELECT id, titulo
        FROM livros
        ORDER BY titulo
    `);


    const leitores = alasql(`
        SELECT id, nome
        FROM leitores
        ORDER BY nome
    `);


    const selectLivro =
        document.getElementById("livroEmprestimo");

    const selectLeitor =
        document.getElementById("leitorEmprestimo");


    selectLivro.innerHTML =
        `<option value="">Selecione um livro</option>` +

        livros.map(livro => `

            <option value="${livro.id}">
                ${protegerHTML(livro.titulo)}
            </option>

        `).join("");


    selectLeitor.innerHTML =
        `<option value="">Selecione um leitor</option>` +

        leitores.map(leitor => `

            <option value="${leitor.id}">
                ${protegerHTML(leitor.nome)}
            </option>

        `).join("");
}


/*
    Atualiza os quatro números do resumo.

    Aqui são utilizados COUNT e WHERE.
*/
function atualizarResumo() {

    // Consultamos os registros diretamente e usamos .length
    // no JavaScript. Assim evitamos COUNT(*)/alias, que pode
    // gerar erro de parser em determinadas versões/configurações
    // do AlaSQL.
    const livros = alasql(`
        SELECT id
        FROM livros
    `).length;

    const leitores = alasql(`
        SELECT id
        FROM leitores
    `).length;

    const emprestimos = alasql(`
        SELECT id
        FROM emprestimos
    `).length;

    const ativos = alasql(`
        SELECT id
        FROM emprestimos
        WHERE status = 'Ativo'
    `).length;

    document.getElementById("totalLivros").textContent =
        livros;

    document.getElementById("totalLeitores").textContent =
        leitores;

    document.getElementById("totalEmprestimos").textContent =
        emprestimos;

    document.getElementById("totalAtivos").textContent =
        ativos;
}


// ================================================================
// ATUALIZAÇÃO GERAL
// ================================================================

/*
    Executa novamente os SELECTs e atualiza toda a interface.
*/
function atualizarSistema() {

    if (!bancoInicializado) {
        return;
    }

    atualizarLivros();
    atualizarLeitores();
    atualizarEmprestimos();
    atualizarSelects();
    atualizarResumo();
}


// ================================================================
// FUNÇÕES DE DATA
// ================================================================

/*
    Coloca a data atual no campo de empréstimo.
*/
function definirDataAtual() {

    const campo =
        document.getElementById("dataEmprestimo");

    const hoje = new Date();

    const ano = hoje.getFullYear();

    const mes =
        String(hoje.getMonth() + 1)
            .padStart(2, "0");

    const dia =
        String(hoje.getDate())
            .padStart(2, "0");


    campo.value = `${ano}-${mes}-${dia}`;
}


/*
    Converte:

    2026-08-09

    para:

    09/08/2026
*/
function formatarData(data) {

    if (!data) {
        return "-";
    }

    const partes =
        String(data).split("-");


    if (partes.length !== 3) {
        return data;
    }


    return `
        ${partes[2]}/${partes[1]}/${partes[0]}
    `;
}


// ================================================================
// NAVEGAÇÃO
// ================================================================

/*
    Controla as três telas:

    Livros
    Leitores
    Empréstimos
*/
function configurarMenu() {

    const botoes =
        document.querySelectorAll(".menu-btn");


    botoes.forEach(botao => {

        botao.addEventListener("click", () => {

            const tela =
                botao.dataset.tela;


            // Remove "active" de todos os botões.
            botoes.forEach(item => {
                item.classList.remove("active");
            });


            // Remove "active" de todas as telas.
            document.querySelectorAll(".tela")
                .forEach(item => {
                    item.classList.remove("active");
                });


            // Ativa o botão selecionado.
            botao.classList.add("active");


            // Ativa a tela correspondente.
            document
                .getElementById(tela)
                .classList.add("active");
        });
    });
}


// ================================================================
// LIVROS DE EXEMPLO
// ================================================================

/*
    Adiciona três livros de exemplo.

    Esta função é apenas para facilitar os testes durante a aula.
*/
function inserirExemplos() {

    const exemplos = [

        [
            "Vidas Secas",
            "Graciliano Ramos",
            1938,
            "Romance"
        ],

        [
            "Capitães da Areia",
            "Jorge Amado",
            1937,
            "Romance"
        ],

        [
            "O Alienista",
            "Machado de Assis",
            1882,
            "Conto"
        ]
    ];


    exemplos.forEach(exemplo => {

        const id = proximoId("livros");


        alasql(`
            INSERT INTO livros
            (id, titulo, autor, ano, categoria)
            VALUES (
                ${id},
                '${protegerTexto(exemplo[0])}',
                '${protegerTexto(exemplo[1])}',
                ${exemplo[2]},
                '${protegerTexto(exemplo[3])}'
            )
        `);
    });


    salvarDados();

    atualizarSistema();

    mostrarMensagem(
        "Livros de exemplo adicionados."
    );
}


// ================================================================
// EVENTOS
// ================================================================

/*
    DOMContentLoaded garante que o JavaScript só comece
    depois que o HTML estiver carregado.
*/
document.addEventListener("DOMContentLoaded", () => {


    // Configura o menu.
    configurarMenu();


    // Formulário de livros.
    document
        .getElementById("formLivro")
        .addEventListener(
            "submit",
            salvarLivro
        );


    // Botão para limpar formulário de livros.
    document
        .getElementById("btnLimparLivro")
        .addEventListener(
            "click",
            limparLivro
        );


    // Formulário de leitores.
    document
        .getElementById("formLeitor")
        .addEventListener(
            "submit",
            salvarLeitor
        );


    // Botão para limpar formulário de leitores.
    document
        .getElementById("btnLimparLeitor")
        .addEventListener(
            "click",
            limparLeitor
        );


    // Formulário de empréstimos.
    document
        .getElementById("formEmprestimo")
        .addEventListener(
            "submit",
            salvarEmprestimo
        );


    // Botão para inserir livros de exemplo.
    document
        .getElementById("btnExemplos")
        .addEventListener(
            "click",
            inserirExemplos
        );


    // Define a data atual.
    definirDataAtual();


    // Cria o banco e as tabelas.
    criarBanco();

});
