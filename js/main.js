//DIMENSOES DO GRAFICO
var margin = {top: 10, right: 25, bottom: 100, left: 40},
    width = Math.min(window.innerWidth - margin.right - margin.left - 20,1500),
    height = 500 - margin.top - margin.bottom,
    w = window.innerWidth - 20;

//FORMATO DE PARSEMENTO DOS DADOS DE DATA
var parseData = d3.time.format("%Y-%m-%d").parse;

var url = "https://spreadsheets.google.com/feeds/cells/1A4HorT3LljFhs__d6YfCsu1OQxUpMod2ax3Hsrwwle4/2/public/values?alt=json";

var le_planilha = function(d) {
    var cells = d.feed.entry; // d são os dados recebidos do Google...
    var numCells = cells.length;
    var cellId, cellPos , conteudo;
    var celulas = {}
    var titulos = {};

    for(var i=0; i < numCells; i++) {

        // lê na string do id a coluna e linha
        cellId = cells[i].id.$t.split('/');
        cellPos = cellId[cellId.length - 1].split('C');
        cellPos[0] = cellPos[0].replace('R', '');
        conteudo = cells[i].content.$t

        if (cellPos[0] == "1") {
            titulos[cellPos[1]] = conteudo

        } else {
            if (!(cellPos[0] in celulas)) {
                celulas[cellPos[0]] = {}
            }
            celulas[cellPos[0]][titulos[cellPos[1]]] = conteudo
        }
    }
    return celulas
}


var baixa_planilha_dados = function (sheet, callback) {
    $.getJSON(url_base+sheet+url_final, function  (d) {
        var dados = le_planilha(d)
        var saida = []
        for (key in dados) {
            var item = dados[key]
            saida.push(item)
        }
        if (callback) callback(saida)
    })
}

var iniciar = function() {
    $.getJSON(url, function (d) {
        dados_tabela = le_planilha(d);
        cria_tabela();
    })
}

function cria_tabela() {
    tableHTML = '<table class="tabela table table-hover table-condensed table-striped table-bordered">';
    tableHeader = "<thead><tr>"
    tableBody = "<tbody>"
    var lista_inicial = ["deputado","partido","estado","fidelidade"];
    lista_inicial.forEach(function (d) {
        if (d == "Total de deputados seguindo") {
            tableHeader += "<th id='total'>" + d + "</th>";
        } else {
            tableHeader += "<th>" + d + "</th>";
        }
    });
    tableHeader += "</tr></thead>"

    var tamanho = Object.keys(dados_tabela).length;
    for (var i in dados_tabela) {
        var linha = "<tr>"
        lista_inicial.forEach(function (d) {
            linha += "<td>"+dados_tabela[i][d]+"</td>"
        })
        linha += "</tr>"
        tableBody += linha;
    }

    tableBody += "</tbody>"
    tableHTML += tableHeader + tableBody + "</table>"
    $("#tabela").append(tableHTML)

    var $tfoot = $('<tfoot></tfoot>');
    $($('thead').clone(true, true).children().get().reverse()).each(function(){
        $tfoot.append($(this));
    });
    $tfoot.insertAfter('table thead');


    $('.tabela tfoot th').each( function () {
        var title = $('.tabela thead th').eq( $(this).index() ).text();
        if (title == "deputado" || title == "partido" || title == "estado") {
            $(this).html( '<input type="text" placeholder="Buscar '+title+'" />' );
        } else {
            $(this).html("");
        }
    } );

    table = $(".tabela").DataTable({
        aaSorting: [],
        "lengthMenu": [[-1], ["Todos"]],
        "language": {
            "lengthMenu": "",
            "zeroRecords": "Não foi encontrado nenhum item",
            "info": "Mostrando página _PAGE_ de _PAGES_",
            "infoEmpty": "Não foi encontrado nenhum item",
            "infoFiltered": "(filtrado do total de _MAX_ itens)",
            "paginate":{
                "previous":"Anterior",
                "next":"Próxima",
                "first":"Primeira",
                "last":"Última"
            }
        }
    });

    table.columns().every( function () {
        var that = this;
        $( 'input', this.footer() ).on( 'keyup change', function () {
            that
                .search( this.value )
                .draw();
        } );
    } );
    $(".dataTables_filter").remove();
    $("label").addClass("pull-left")
}

iniciar();

function comeca_tudo(data) {

    //gambiarra para não dar zoom além dos anos dos dados
    panExtent = {x: dominio_x, y: [-10000,400000] };

    bisectDate = d3.bisector(function(d) { return d.data; }).left;

    x = d3.time.scale()
        .domain(d3.extent(data[1]['data_fake'], function(d) { return d; }))
        .range([0, width]);

    y = d3.scale.linear()
        .domain([
            d3.min(times, function(t) { return d3.min(t.valores, function(v) { return v.indice; }); }),
            d3.max(times, function(t) { return d3.max(t.valores, function(v) { return v.indice; }); })
        ])
        .range([height, 0]);

    x2 = d3.time.scale()
        .domain(x.domain())
        .range([0, width]);

    y2 = d3.scale.linear()
        .range([height2,0])
        .domain(y.domain());

    var xAxis = d3.svg.axis().scale(x).orient("bottom").ticks(d3.time.years, 4),
        xAxis2 = d3.svg.axis().scale(x2).orient("bottom").ticks(d3.time.years, 2),
        yAxis = d3.svg.axis().scale(y).orient("left");

    var brush = d3.svg.brush()
        .x(x2)
        .extent(x2.domain())
        .on("brush", brushed);

    var arc = d3.svg.arc()
        .outerRadius(height2 / 2)
        .startAngle(0)
        .endAngle(function(d, i) { return i ? -Math.PI : Math.PI; });

    line = d3.svg.line()
        .interpolate("cardinal")
        .defined(function(d) {  return d.indice != null; })
        .x(function(d) {
            return x(d.data);
        })
        .y(function(d) {
            return y(d.indice);
        });

    line2 = d3.svg.line()
        .interpolate("linear")
        .defined(function(d) { return d.indice != null; })
        .x(function(d) {
            return x2(d.data);
        })
        .y(function(d) {
            return y2(d.indice);
        });

    svg = d3.select("#grafico")
        .attr("width", width + margin.left + margin.right)
        .attr("height", height + margin.top + margin.bottom);

    svg.append("defs").append("clipPath")
        .attr("id", "clip")
        .append("rect")
        .attr("width", width)
        .attr("height", height);

    focus = svg.append("g")
        .attr("class", "focus")
        .attr("transform", "translate(" + margin.left + "," + margin.top + ")");

    context = svg.append("g")
        .attr("class", "context")
        .attr("transform", "translate(" + margin2.left + "," + margin2.top + ")");

    focus.append("g")
        .selectAll('.times')
        .data(times)
        .enter().append("g")
        .attr("class", "times")
        .append('path')
        .attr("class", function (d,i) {
            return "line " + replaceAll(d.nome,' ','-');
        })
        .attr("opacity", 0.7)
        .attr("d", function(d) { return line(d.valores); })
    /*.on("mouseover", mostra_tooltip)
     .on("mouseout", function(d, i) {
     tooltip.style("opacity", 0)
     })
     .on("click", function(d) {
     selecionaLinha(d.nome);
     mostraLinha(timeEscolhido, linhaSelecionada, false);
     });*/

    eixo_x = focus.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height + ")")
        .call(xAxis);

    focus.append("g")
        .attr("class", "y axis")
        .call(yAxis);

    focus.append("text")
        .attr("class", "y label")
        .attr("text-anchor", "end")
        .attr("y", 6)
        .attr("dy", ".75em")
        .attr("transform", "rotate(-90)")
        .style("font-weight","bold")
        .text("PONTUAÇÃO ELO");


    context.append("path")
        .datum(times[timeEscolhido].valores)
        .attr("class", "line_aux")
        .attr("d", line2);

    context.append("g")
        .attr("class", "x axis")
        .attr("transform", "translate(0," + height2 + ")")
        .call(xAxis2);

    brushg = context.append("g")
        .attr("class", "x brush")
        .call(brush);

    brushg.selectAll(".resize").append("path")
        .attr("transform", "translate(0," +  height2 / 2 + ")")
        .attr("d", arc);

    brushg.selectAll("rect")
        .attr("height", height2 );

    linha_tooltip = focus.append('line')
        .attr("class","linha_tooltip")
        .style("opacity",0)
        .style("stroke","black")
        .style("stroke-dasharray","5,5");

    //linha da média
    focus.append('line')
        .attr("class","linha_media")
        .style("opacity",1)
        .style("stroke","#505050")
        .style("stroke-dasharray","10,10")
        .attr("x1",x.range()[0])
        .attr("x2",x.range()[1])
        .attr("y1",y(946))
        .attr("y2",y(946));

    focus.append("text")
        .attr("class", "linha_media label")
        .attr("text-anchor", "start")
        .attr("fill","black")
        .attr("y", y(946)+12)
        .attr("dx", ".4em")
        .style("font-weight","bold")
        .text("MÉDIA GERAL HISTÓRICA");

    //mouseover
    focus.append('rect')
        .attr("class","overlay")
        .attr('opacity',0)
        .attr("width", width)
        .attr("height", height)
        .on("mousemove", mousemove)
        .on("mouseout", function(d, i) {
            tooltip_jogo.style("opacity", 0);
            linha_tooltip.style("opacity",0);
        });

    //destaca a linha
    mostraLinha(timeEscolhido, linhaSelecionada, false);

    //importa o svg da tacinha
    var svg_name = "img/trophy.svg";
    d3.xml(svg_name, function(xml) {

        // Take xml as nodes.
        imported_node = document.importNode(xml.documentElement, true);
        coloca_tacinhas();

    });


    function brushed() {
        //arruma a data do grafico de cima
        x.domain(brush.empty() ? x2.domain() : brush.extent());

        //mostra os ticks de todos os anos se for menos que dez anos no grafico
        if (x.domain()[1].getFullYear() - x.domain()[0].getFullYear() < 11) {
            xAxis.ticks(d3.time.years, 1)
        } else {
            xAxis.ticks(d3.time.years, 4)
        }

        //redesenha
        focus.selectAll(".line").attr("d", function(d) { return line(d.valores); });
        focus.select(".x.axis").call(xAxis);

        //leva os ticks do eixo X pro meio dos anos
        var pixels = x(new Date('07/01/1990')) - x(new Date('01/01/1990'))
        eixo_x.selectAll('text').attr('transform','translate('+pixels+',0)')
        eixo_x.selectAll('line').attr('transform','translate('+pixels+',0)')

        //muda a tacinha de lugar
        focus.selectAll(".tacinha")
            .transition()
            .attr("transform", function(d,i){
                return "translate(" + (x(d.data)-width/60)  + "," + (height-30)  + ") scale(0.05)";
            });

        //e o textinho também
        /*
         focus.selectAll(".titulo_tacinha")
         .attr("transform", function (d,i) {
         return "translate("+(x(d.data)) +",0)"
         });*/

        focus.selectAll(".titulo_tacinha")
            .selectAll('text')
            .transition()
            .attr("x",function (d) {
                return x(d.data)+2;
            })

    }

    //arruma o padding do título pra se alinhar ao do gráfico

    $(".imagem").css("padding-left",svg.node().getBoundingClientRect()['left']+margin.left)

    //esconde o loading
    $('#loading').hide();

}