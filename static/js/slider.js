function containerAnimation(direction, containerOut, containerIn) {
    console.log('applyAnimationToContainers, direction', direction);

    const classForOut = direction === 'left' ? 'outLeft' : direction === 'right' ? 'outRight' : '';
    const classForIn = direction === 'left' ? 'inRight' : direction === 'right' ? 'inLeft' : '';

    $(containerOut).addClass(classForOut);


    setTimeout(() => {
        // $(containerOut).children('.plate').empty();
        // $(containerIn).children('.plate').empty();
        $(containerOut).hide();
        $(containerIn).show();
        $(containerIn).addClass(classForIn);
        setTimeout(() => {
            $(containerOut).removeClass(classForOut);
            $(containerIn).removeClass(classForIn);
        }, 100);
    }, 100);
}