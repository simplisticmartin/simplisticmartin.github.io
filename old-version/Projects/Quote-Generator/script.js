var text = document.getElementById('text');
        var newDom = '';
        var animationDelay = 10;

        for(let i = 0; i < text.innerText.length; i++)
        {
            newDom += '<span class="char">' + (text.innerText[i] == ' ' ? '&nbsp;' : text.innerText[i])+ '</span>';
        }

        text.innerHTML = newDom;
        var length = text.children.length;

        for(let i = 0; i < length; i++)
        {
            text.children[i].style['animation-delay'] = animationDelay * i + 'ms';
        }
        let author = document.getElementById('author');
        var newDom = '';
        var animationDelay = 10;

      /*  for(let i = 0; i < author.innerText.length; i++)
        {
            newDom += '<span class="char">' + (author.innerText[i] == ' ' ? '&nbsp;' : author.innerText[i])+ '</span>';
        }

        author.innerHTML = newDom;
        var length = author.children.length;

        for(let i = 0; i < length; i++)
        {
            author.children[i].style['animation-delay'] = animationDelay * i + 'ms';
        }*/